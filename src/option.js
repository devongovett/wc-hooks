import {useOption} from '@react-aria/listbox';
import {attrs} from './attrs';
import {createHooks, useRef} from './hooks';

const template = document.createElement('template');
template.innerHTML = `
<style>
.option {
  position: relative;
  padding: 8px 0 8px 12px;
  list-style-type: none;
  cursor: default;
  user-select: none;
}

.contents {
  display: flex;
  align-items: center;
}

.option:focus {
  outline: none;
}

.option.focus {
  color: white;
  background: rgb(49, 130, 206);
}

.option.selected {
  font-weight: bold;
}

.checkmark {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  display: flex;
  align-items: center;
  padding-right: 16px;
  color: #718096;
}

.option.focus .checkmark {
  color: white;
}

.option.selected .checkmark {
  display: block;
}
</style>

<li class="option">
  <div class="contents"></div>
  <span
    class="checkmark"
    aria-hidden="true">
    <svg class="h-5 w-5 fill-current" viewBox="0 0 20 20">
      <path
        fill-rule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clip-rule="evenodd"
      />
    </svg>
  </span>
</li>
`;

class TestOption extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.hooks = createHooks(() => this.update());
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.option = this.shadowRoot.querySelector('.option');
    this.contents = this.shadowRoot.querySelector('.contents');
    this.optionProps = attrs(this.option);
    this.hooks.run();
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.hooks.run();
  }

  get item() {
    return this._item;
  }

  set item(item) {
    this._item = item;
    this.hooks.run();
  }

  update() {
    if (!this.state || !this.item || !this.option) {
      return;
    }

    let isDisabled = this.state.disabledKeys.has(this.item.key);
    let isSelected = this.state.selectionManager.isSelected(this.item.key);
    let isFocused = this.state.selectionManager.focusedKey === this.item.key;
    let ref = useRef(this.option);
    let {optionProps} = useOption(
      {
        key: this.item.key,
        isDisabled,
        isSelected,
        shouldSelectOnPressUp: true,
        shouldFocusOnHover: true
      },
      this.state,
      ref
    );

    this.optionProps.update(optionProps);

    if (isSelected) {
      this.option.classList.add('selected');
    } else {
      this.option.classList.remove('selected');
    }

    if (isFocused) {
      this.option.classList.add('focus');
    } else {
      this.option.classList.remove('focus');
    }

    this.contents.innerHTML = this.item.rendered;
    this.hooks.runEffects();
  }

  disconnectedCallback() {
    this.hooks.unmount();
    if (this.optionProps) {
      this.optionProps.destroy();
    }
  }
}

customElements.define('test-option', TestOption);
