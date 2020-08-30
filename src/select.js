import {useSelectState} from '@react-stately/select';
import {useSelect, useHiddenSelect} from '@react-aria/select';
import {Item} from '@react-stately/collections';
import {useButton} from '@react-aria/button';
import {useFocusRing} from '@react-aria/focus';
import {mergeProps} from '@react-aria/utils';
import { attrs } from './attrs';
import {createHooks, useRef} from './hooks';
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

class TestSelect extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.hooks = createHooks(() => this.update());
    this._items = [];
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.wrapper = this.shadowRoot.querySelector('.wrapper');
    this.label = this.shadowRoot.querySelector('.label');
    this.hiddenSelect = this.shadowRoot.querySelector('.hiddenSelect');
    this.hiddenSelectLabel = this.shadowRoot.querySelector('#hiddenSelectLabel');
    this.input = this.shadowRoot.querySelector('.input');
    this.select = this.shadowRoot.querySelector('.select');
    this.button = this.shadowRoot.querySelector('.button');
    this.valueNode = this.shadowRoot.querySelector('.value');
    this.labelProps = attrs(this.label);
    this.hiddenSelectProps = attrs(this.hiddenSelect);
    this.inputProps = attrs(this.input);
    this.selectProps = attrs(this.select);
    this.buttonProps = attrs(this.button);
    this.valueProps = attrs(this.valueNode);
    this.hooks.run();
  }

  get value() {
    return this.getAttribute('value');
  }

  set value(value) {
    this.setAttribute('value', value);
  }

  get items() {
    return this._items;
  }

  set items(items) {
    this._items = items;
    this.hooks.run();
  }

  static get observedAttributes() {
    return ['value'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.hooks.run();
  }

  update() {
    let dispatchChangeEvent = dispatcher(this, 'change');
    let props = {
      label: 'test',
      items: this.items,
      children: (v) => ({type: Item, key: v.id, props: {children: v.name}}),
      selectedKey: this.value,
      onSelectionChange: (key) => {
        // Behave like a DOM node, not a controlled React component. Update state and fire change event.
        this.value = key;
        dispatchChangeEvent(key);
      }
    };

    let state = useSelectState(props);

    let ref = useRef(this.button);
    let {labelProps, triggerProps, valueProps, menuProps} = useSelect(
      props,
      state,
      ref
    );

    let {buttonProps} = useButton(triggerProps, ref);
    buttonProps.onKeyDownCapture = triggerProps.onKeyDownCapture; // TODO: fix this
    let {focusProps, isFocusVisible} = useFocusRing();

    let {containerProps, inputProps, selectProps} = useHiddenSelect(props, state, ref);

    this.labelProps.update(labelProps);
    this.buttonProps.update(mergeProps(focusProps, buttonProps));
    this.valueProps.update(valueProps);
    this.hiddenSelectProps.update(containerProps);
    this.inputProps.update(inputProps);
    this.selectProps.update(selectProps);

    // Copy text content from label slot into hidden select label.
    this.hiddenSelectLabel.textContent = this.label.firstElementChild.assignedElements().map(e => e.textContent).join('');

    // Add option elements to hidden select.
    let options = this.select.querySelectorAll('option');
    [...state.collection].forEach((item, i) => {
      let option = options[i];
      if (!option) {
        option = document.createElement('option');
        this.select.appendChild(option);
      }

      option.value = item.key;
      option.textContent = item.rendered;
    });

    // Update contents of button based on selected item. If none, show placeholder.
    if (state.selectedItem) {
      this.valueNode.textContent = state.selectedItem.rendered;
      this.valueNode.classList.remove('placeholder');
    } else {
      this.valueNode.textContent = 'Select an option';
      this.valueNode.classList.add('placeholder');
    }

    if (isFocusVisible) {
      this.button.classList.add('focus');
    } else {
      this.button.classList.remove('focus');
    }

    // If the select is open, create the listbox element if needed, and update its content.
    // Otherwise, if the select is now not open, remove the listbox.
    if (state.isOpen) {
      if (!this.listbox) {
        this.listbox = document.createElement('test-listbox');
        this.wrapper.appendChild(this.listbox);
      }

      this.listbox.domProps = menuProps;
      this.listbox.state = state;
    } else if (this.listbox) {
      this.listbox.remove();
      this.listbox = null;
    }

    this.hooks.runEffects();
  }

  disconnectedCallback() {
    this.hooks.unmount();
    if (this.listboxProps) {
      this.listboxProps.destroy();
    }
  }
}

customElements.define('test-select', TestSelect);
