import {useListBox} from '@react-aria/listbox';
import {useOverlay, useDismissButton} from '@react-aria/overlays';
import {useFocusScope} from '@react-aria/focus';
import {mergeProps} from '@react-aria/utils';
import { attrs } from './attrs';
import {createHooks, useRef} from './hooks';
import './option';

const template = document.createElement('template');
template.innerHTML = `
<style>
.overlay {
  position: absolute;
  margin-top: 4px;
  width: 100%;
  border-radius: 6px;
  background: white;
  box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
  z-index: 50;
}

.listbox {
  border-radius: 6px;
  padding: 4px 0;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.05);
  overflow: auto;
  margin: 0;
}

.listbox:focus {
  outline: none;
}
</style>

<div class="overlay">
  <button class="dismissButton"></button>
  <ul class="listbox" class="max-h-56 rounded-md py-1 text-base leading-6 shadow-xs overflow-auto focus:outline-none sm:text-sm sm:leading-5"></ul>
  <button class="dismissButton"></button>
</div>
`;

class TestListBox extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.hooks = createHooks(() => this.update());
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.overlay = this.shadowRoot.querySelector('.overlay');
    this.dismissButtons = this.shadowRoot.querySelectorAll('.dismissButton');
    this.listbox = this.shadowRoot.querySelector('.listbox');
    this.overlayProps = attrs(this.overlay);
    this.dismissButtonProps = [...this.dismissButtons].map(b => attrs(b));
    this.listboxProps = attrs(this.listbox);
    this.hooks.run();
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = state;
    this.hooks.run();
  }

  update() {
    if (!this.state) {
      return;
    }

    let ref = useRef(this.listbox);
    let {listBoxProps} = useListBox(
      {
        ...this.domProps,
        autoFocus: this.state.focusStrategy || true,
        disallowEmptySelection: true
      },
      this.state,
      ref
    );

    let overlayRef = useRef(this.overlay);
    let {overlayProps} = useOverlay(
      {
        onClose: () => this.state.close(),
        shouldCloseOnBlur: true,
        isOpen: this.state.isOpen,
        isDismissable: true
      },
      overlayRef
    );

    useFocusScope(overlayRef, {restoreFocus: true});

    let {dismissButtonProps} = useDismissButton({onDismiss: this.state.close});

    this.listboxProps.update(listBoxProps);
    this.overlayProps.update(overlayProps);
    this.dismissButtonProps.forEach(p => p.update(dismissButtonProps));

    let options = this.listbox.querySelectorAll('test-option');
    [...this.state.collection].forEach((item, i) => {
      let option = options[i];
      if (!option) {
        option = document.createElement('test-option');
        this.listbox.appendChild(option);
      }

      option.state = this.state;
      option.item = item;
    });

    this.hooks.runEffects();
  }

  disconnectedCallback() {
    this.hooks.unmount();
    this.listboxProps.destroy();
    this.overlayProps.destroy();
    this.dismissButtonProps.forEach(p => p.destroy());
  }
}

customElements.define('test-listbox', TestListBox);
