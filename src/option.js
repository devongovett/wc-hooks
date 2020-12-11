import {useOption} from '@react-aria/listbox';
import {attrs} from './attrs';
import {useRef} from './hooks';
import {Controller, prop} from './controller';

const template = document.createElement('template');
template.innerHTML = `
<style>
.option {
  position: relative;
  padding: 8px 0 8px 12px;
  list-style-type: none;
  cursor: default;
  user-select: none;
  display: flex;
  align-items: center;
}

.contents {
  display: flex;
  align-items: center;
  flex: 1;
}

:host(:focus) {
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
  display: none;
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

<div class="option">
  <div class="contents">
    <slot></slot>
  </div>
  <svg class="checkmark" aria-hidden="true" width="20" height="20" viewBox="0 0 20 20">
    <path
      fill="currentColor"
      fill-rule="evenodd"
      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      clip-rule="evenodd"
    />
  </svg>
</div>
`;

class OptionController extends Controller {
  @prop state;
  @prop item;
  
  optionProps;
  
  update() {
    let state = this.state;
    if (!state || !this.item) {
      return;
    }
        
    let isDisabled = state.disabledKeys.has(this.item.key);
    let isSelected = state.selectionManager.isSelected(this.item.key);
    let ref = useRef(this.props.element);
    let {optionProps} = useOption(
      {
        key: this.item.key,
        isDisabled,
        isSelected,
        shouldSelectOnPressUp: true,
        shouldFocusOnHover: true
      },
      state,
      ref
    );
        
    this.optionProps = optionProps;
  }
}

class TestOption extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.option = this.shadowRoot.querySelector('.option');
    this.contents = this.shadowRoot.querySelector('.contents');
    this.optionProps = attrs(this);
    
    this.controller = new OptionController({
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

  get item() {
    return this.controller.item;
  }

  set item(item) {
    this.controller.item = item;
  }

  update() {
    if (!this.state || !this.item) {
      return;
    }
    
    let isSelected = this.state.selectionManager.isSelected(this.item.key);
    let isFocused = this.state.selectionManager.focusedKey === this.item.key;

    this.optionProps.update(this.controller.optionProps);

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

    this.contents.textContent = this.item.rendered;
  }

  disconnectedCallback() {
    this.controller.unmount();
    if (this.optionProps) {
      this.optionProps.destroy();
    }
  }
}

customElements.define('test-option', TestOption);
