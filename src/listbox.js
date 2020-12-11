import {useListBox} from '@react-aria/listbox';
import {attrs} from './attrs';
import {useRef} from './hooks';
import {Controller, prop} from './controller';
import './option';

const template = document.createElement('template');
template.innerHTML = `
<style>
.listbox {
  border-radius: 6px;
  padding: 4px 0;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: auto;
  margin: 0;
}

:host(:focus) {
  outline: none;
}
</style>

<div role="presentation" class="listbox">
  <slot></slot>
</div>
`;

class ListBoxController extends Controller {
  @prop state;
  @prop id;
  @prop 'aria-labelledby';
  
  listBoxProps;
  
  update() {
    if (!this.state) {
      return;
    }
    
    let ref = useRef(this.props.element);
    let {listBoxProps} = useListBox(
      {
        ...this.props,
        autoFocus: this.state.focusStrategy || true,
        disallowEmptySelection: true
      },
      this.state,
      ref
    );
    
    this.listBoxProps = listBoxProps;
  }
}

class TestListBox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.listboxProps = attrs(this);
    
    this.controller = new ListBoxController({
      element: this,
      update: () => this.update()
    });
  }

  get state() {
    return this.controller.state;
  }

  set state(state) {
    this.controller.state = state;
  }
  
  static get observedAttributes() {
    return ['id', 'aria-labelledby'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.controller[name] = newValue;
  }

  update() {
    if (!this.state) {
      return;
    }
    
    this.listboxProps.update(this.controller.listBoxProps);

    let options = this.querySelectorAll('test-option');
    [...this.state.collection].forEach((item, i) => {
      let option = options[i];
      if (!option) {
        option = document.createElement('test-option');
        this.appendChild(option);
      }

      option.state = this.state;
      option.item = item;
    });
  }

  disconnectedCallback() {
    this.controller.unmount();
    this.listboxProps.destroy();
  }
}

customElements.define('test-listbox', TestListBox);
