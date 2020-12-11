export function dispatcher(el, type) {
  return (e) => {
    const changeEvent = new CustomEvent(type, {
      bubbles: true,
      cancelable: false,
      detail: e
    });
    el.dispatchEvent(changeEvent);
  };
}

export function attr(arg) {
  return {
    kind: 'method',
    key: arg.key,
    placement: 'prototype',
    descriptor: {
      get() {
        return this.getAttribute(arg.key);
      },
      set(val) {
        this.setAttribute(arg.key, val);
      }
    }
  }
}
