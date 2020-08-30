import {useButton} from '@react-aria/button';
import {useFocusRing} from '@react-aria/focus';
import {mergeProps} from '@react-aria/utils';
import { attrs } from './attrs';
import {createHooks} from './hooks';

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

function dispatcher(el, type) {
  return (e) => {
    const changeEvent = new CustomEvent(type, {
      bubbles: true,
      cancelable: false,
      detail: e
    });
    el.dispatchEvent(changeEvent);
  };
}

class TestButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.hooks = createHooks(() => this.update());
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.button = this.shadowRoot.querySelector('button');
    this.attrs = attrs(this.button);
    this.hooks.run();
  }

  get isDisabled() {
    return this.hasAttribute('disabled');
  }

  set isDisabled(isDisabled) {
    if (isDisabled) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  static get observedAttributes() {
    return ['disabled'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.hooks.run();
  }

  update() {
    let { buttonProps, isPressed } = useButton({
      isDisabled: this.isDisabled || undefined,
      onPress: dispatcher(this, 'press'),
      onPressStart: dispatcher(this, 'pressstart'),
      onPressEnd: dispatcher(this, 'pressend')
    });

    let { focusProps, isFocusVisible } = useFocusRing();

    buttonProps = mergeProps(buttonProps, focusProps);

    this.attrs.update(buttonProps);

    if (isPressed) {
      this.button.classList.add('pressed');
    } else {
      this.button.classList.remove('pressed');
    }

    if (isFocusVisible) {
      this.button.classList.add('focus');
    } else {
      this.button.classList.remove('focus');
    }

    this.hooks.runEffects();
  }

  disconnectedCallback() {
    this.hooks.unmount();
    this.attrs.destroy();
  }
}

customElements.define('test-button', TestButton);
