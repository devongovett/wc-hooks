export function attrs(node) {
  let props;
  let apply = (update) => {
    for (let key in update) {
      if (/^on[A-Z]/.test(key)) {
        let event = key.slice(2).toLowerCase();
        let capture = false;
        if (key.endsWith("Capture")) {
          capture = true;
          event = event.slice(0, -7);
        }

        if (
          props[key] != null &&
          (update[key] == null || update[key] !== props[key])
        ) {
          node.removeEventListener(event, props[key], capture);
        }

        if (update[key] != null) {
          node.addEventListener(event, update[key], capture);
        }
      } else if (key === "style") {
        Object.assign(node.style, update[key]);
      } else {
        if (update[key] == null) {
          node.removeAttribute(key);
        } else {
          node.setAttribute(key, update[key]);
        }
      }
    }
  };

  return {
    update(newProps) {
      if (props == null) {
        props = newProps;
        apply(newProps);
        return;
      }

      let update = {};
      for (let key in newProps) {
        if (newProps[key] !== props[key]) {
          update[key] = newProps[key];
        }
      }

      for (let key in props) {
        if (props[key] != null && newProps[key] == null) {
          update[key] = undefined;
        }
      }

      apply(update);
      props = newProps;
    },
    destroy() {
      if (props == null) {
        return;
      }

      for (let key in props) {
        if (/^on[A-Z]/.test(key)) {
          let event = key.slice(2).toLowerCase();
          node.removeEventListener(event, props[key]);
        }
      }
    }
  };
}
