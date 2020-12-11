import {useOverlay, useDismissButton} from '@react-aria/overlays';
import {useFocusScope} from '@react-aria/focus';
import {attrs} from './attrs';
import {useRef} from './hooks';
import {Controller, prop} from './controller';
import {dispatcher} from './utils';

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
</style>

<div class="overlay">
  <button class="dismissButton"></button>
  <slot></slot>
  <button class="dismissButton"></button>
</div>
`;

class OverlayController extends Controller {
  @prop isOpen;
  @prop onClose;
  
  // overlayProps;
  // dismissButtonProps;
  
  update() {
    let overlayRef = useRef(this.props.element);
    let {overlayProps} = useOverlay(
      {
        onClose: this.onClose,
        shouldCloseOnBlur: true,
        isOpen: true,
        isDismissable: true
      },
      overlayRef
    );

    useFocusScope(overlayRef, {restoreFocus: true});

    let {dismissButtonProps} = useDismissButton({onDismiss: this.onClose});
    this.overlayProps = overlayProps;
    this.dismissButtonProps = dismissButtonProps;
  }
}

class TestOverlay extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    this.controller = new OverlayController({
      element: this.overlay,
      onClose: dispatcher(this, 'close'),
      update: () => this.update()
    });
  }

  connectedCallback() {
    this.shadowRoot.appendChild(template.content.cloneNode(true));
    this.overlay = this.shadowRoot.querySelector('.overlay');
    this.dismissButtons = this.shadowRoot.querySelectorAll('.dismissButton');
    this.overlayProps = attrs(this.overlay);
    this.dismissButtonProps = [...this.dismissButtons].map(b => attrs(b));
    
    this.update();
  }
  
  update() {
    this.overlayProps.update(this.controller.overlayProps);
    this.dismissButtonProps.forEach(p => p.update(this.controller.dismissButtonProps));
  }
  
  disconnectedCallback() {
    this.controller.unmount();
    this.overlayProps.destroy();
    this.dismissButtonProps.forEach(p => p.destroy());
  }
}

customElements.define('test-overlay', TestOverlay);
