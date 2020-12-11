import {useButton} from '@react-aria/button';
import {useFocusRing} from '@react-aria/focus';
import {mergeProps} from '@react-aria/utils';
import { attrs } from './attrs';
import {useRef} from './hooks';
import {Controller, prop} from './controller';
import {attr, dispatcher} from './utils';

const template = document.createElement('template');
template.innerHTML = `
<button><slot></slot></button>
<style>
button {
  background: rgb(66, 153, 225);
  border: none;
  color: white;
  padding: 8px 16px;
  font-size: 16px;
  line-height: 1.5;
  font-weight: bold;
  transition: all 150ms ease-in-out;
  border-radius: 4px;
}

button.pressed {
  background: rgb(43, 108, 176);
}

button:focus {
  outline: none;
}

button.focus {
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
}
</style>
`;

export class ButtonController extends Controller {
  @prop isDisabled;
  @prop onPress;
  
  buttonProps;
  isPressed;
  isFocusVisible;
  
  update() {
    let ref = useRef(this.props.element);
    let {buttonProps, isPressed} = useButton(this.props, ref);
    let {focusProps, isFocusVisible} = useFocusRing();
    
    this.buttonProps = mergeProps(buttonProps, focusProps);
    this.isPressed = isPressed;
    this.isFocusVisible = isFocusVisible;
  }
}

class TestButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.button = this.shadowRoot.querySelector('button');
    this.attrs = attrs(this.button);
    
    this.controller = new ButtonController({
      element: this.button,
      isDisabled: this.isDisabled || undefined,
      onPress: dispatcher(this, 'press'),
      update: () => this.update()
    });
    
    this.update();
  }
  
  @attr disabled;
  
  static get observedAttributes() {
    return ['disabled'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.controller.isDisabled = this.disabled;
  }
  
  update() {
    this.attrs.update(this.controller.buttonProps);

    if (this.controller.isPressed) {
      this.button.classList.add('pressed');
    } else {
      this.button.classList.remove('pressed');
    }
    
    if (this.controller.isFocusVisible) {
      this.button.classList.add('focus');
    } else {
      this.button.classList.remove('focus');
    }
  }

  disconnectedCallback() {
    this.controller.unmount();
    this.attrs.destroy();
  }
}

customElements.define('test-button', TestButton);
