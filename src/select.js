import {useSelectState} from '@react-stately/select';
import {useSelect, useHiddenSelect} from '@react-aria/select';
import {Item} from '@react-stately/collections';
import {useButton} from '@react-aria/button';
import {useFocusRing} from '@react-aria/focus';
import {mergeProps} from '@react-aria/utils';
import { attrs } from './attrs';
import {useRef} from './hooks';
import {Controller, prop, state, method} from './controller';
import {dispatcher, attr} from './utils';
import './overlay';
import './listbox';

const template = document.createElement('template');
template.innerHTML = `
<style>
.wrapper {
  width: 192px;
  position: relative;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
}

.label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  color: #4a5568;
}

.button {
  border: 1px solid #cbd5e0;
  border-radius: 6px;
  cursor: default;
  position: relative;
  width: 100%;
  padding: 8px 40px 8px 12px;
  text-align: left;
  transition: all 125ms ease-in-out;
  background: white;
  font-size: 16px;
}

.button:focus {
  outline: none;
}

.button.focus {
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.5);
}

.value {
  display: flex;
  align-items: center;
  color: #2d3748;
}

.value.placeholder {
  color: #a0aec0;
}

.chevron {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: none;
  display: flex;
  align-items: center;
  padding-right: 8px;
}

.chevron svg {
  width: 20px;
  height: 20px;
  color: #a0aec0;
}
</style>

<div class="wrapper">
  <div class="label">
    <slot name="label"></slot>
  </div>
  <div class="hiddenSelect">
    <input class="input" />
    <label>
      <span id="hiddenSelectLabel"></span>
      <select class="select"></select>
    </label>
  </div>
  <button class="button">
    <span class="value">
      Select an option
    </span>
    <span
      aria-hidden="true"
      class="chevron">
      <svg
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor">
        <path
          d="M7 7l3-3 3 3m0 6l-3 3-3-3"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  </button>
</div>
`;

class SelectController extends Controller {
  constructor(props) {
    super({
      ...props,
      items: props.items || [],
      children: (v) => ({type: Item, key: v.value, props: {children: v.textContent}}),
      defaultSelectedKey: props.selectedKey,
      selectedKey: undefined
    });
  }
  
  @prop items;
  
  @state('setSelectedKey') selectedKey;
  @state collection;
  @state selectedItem;
  @state selectionManager;
  @state isOpen;
  @state disabledKeys;
  @state focusStrategy;
  
  @method open;
  @method toggle;
  @method close;
  
  labelProps;
  buttonProps;
  valueProps;
  menuProps;
  hiddenSelectProps;
  inputProps;
  selectProps;
  isFocusVisible;
  
  update() {
    this.state = useSelectState(this.props);
    let ref = useRef(this.props.element);
    let {labelProps, triggerProps, valueProps, menuProps} = useSelect(
      this.props,
      this.state,
      ref
    );
    
    let {buttonProps} = useButton(triggerProps, ref);
    buttonProps.onKeyDownCapture = triggerProps.onKeyDownCapture; // TODO: fix this
    
    let {focusProps, isFocusVisible} = useFocusRing();
    
    this.labelProps = labelProps;
    this.buttonProps = mergeProps(buttonProps, focusProps);
    this.valueProps = valueProps;
    this.menuProps = menuProps;
    this.isFocusVisible = isFocusVisible;
    
    let {containerProps, inputProps, selectProps} = useHiddenSelect(this.props, this.state, ref);
    this.hiddenSelectProps = containerProps;
    this.inputProps = inputProps;
    this.selectProps = selectProps;
  }
}

class TestSelect extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.wrapper = this.shadowRoot.querySelector('.wrapper');
    this.labelNode = this.shadowRoot.querySelector('.label');
    this.hiddenSelect = this.shadowRoot.querySelector('.hiddenSelect');
    this.hiddenSelectLabel = this.shadowRoot.querySelector('#hiddenSelectLabel');
    this.input = this.shadowRoot.querySelector('.input');
    this.select = this.shadowRoot.querySelector('.select');
    this.button = this.shadowRoot.querySelector('.button');
    this.valueNode = this.shadowRoot.querySelector('.value');
    this.labelProps = attrs(this.labelNode);
    this.hiddenSelectProps = attrs(this.hiddenSelect);
    this.inputProps = attrs(this.input);
    this.selectProps = attrs(this.select);
    this.buttonProps = attrs(this.button);
    this.valueProps = attrs(this.valueNode);
    
    this.controller = new SelectController({
      element: this.button,
      label: this.label,
      selectedKey: this.value,
      onSelectionChange: dispatcher(this, 'change'),
      update: () => this.update()
    });
    
    this.observer = new MutationObserver(() => this.updateItems());
    this.observer.observe(this, {childList: true});
    this.updateItems();
  }
  
  @attr value;
  @attr label;

  get items() {
    return this.controller.items;
  }

  set items(items) {
    this.controller.items = items;
  }
  
  updateItems() {
    this.controller.items = this.querySelectorAll('option');
  }

  static get observedAttributes() {
    return ['value', 'label'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.controller) return;
    this.controller.selectedKey = this.value;
    this.controller.label = this.label;
  }

  update() {
    this.labelProps.update(this.controller.labelProps);
    this.buttonProps.update(this.controller.buttonProps);
    this.valueProps.update(this.controller.valueProps);
    this.hiddenSelectProps.update(this.controller.hiddenSelectProps);
    this.inputProps.update(this.controller.inputProps);
    this.selectProps.update(this.controller.selectProps);

    this.labelNode.textContent = this.label;
    this.hiddenSelectLabel.textContent = this.label;

    // Add option elements to hidden select.
    let options = this.select.querySelectorAll('option');
    [...this.controller.collection].forEach((item, i) => {
      let option = options[i];
      if (!option) {
        option = document.createElement('option');
        this.select.appendChild(option);
      }

      option.value = item.key;
      option.textContent = item.rendered;
    });

    // Update contents of button based on selected item. If none, show placeholder.
    if (this.controller.selectedItem) {
      this.valueNode.textContent = this.controller.selectedItem.rendered;
      this.valueNode.classList.remove('placeholder');
    } else {
      this.valueNode.textContent = 'Select an option';
      this.valueNode.classList.add('placeholder');
    }

    if (this.controller.isFocusVisible) {
      this.button.classList.add('focus');
    } else {
      this.button.classList.remove('focus');
    }

    // If the select is open, create the listbox element if needed, and update its content.
    // Otherwise, if the select is now not open, remove the listbox.
    if (this.controller.isOpen) {
      if (!this.listbox) {
        this.listbox = document.createElement('test-listbox');
        this.listboxProps = attrs(this.listbox);
        this.overlay = document.createElement('test-overlay');
        this.overlay.addEventListener('close', () => {
          this.controller.close();
        });
        
        this.overlay.appendChild(this.listbox);
        this.wrapper.appendChild(this.overlay);
      }
      
      this.listboxProps.update(this.controller.menuProps);
      this.listbox.state = this.controller;
    } else if (this.listbox) {
      this.overlay.remove();
      this.listboxProps.destroy();
      this.listbox.remove();
      this.overlay = null;
      this.listbox = null;
      this.listboxProps = null;
    }
  }

  disconnectedCallback() {
    this.controller.unmount();
    if (this.listboxProps) {
      this.listboxProps.destroy();
    }
  }
}

customElements.define('test-select', TestSelect);
