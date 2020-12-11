import {createHooks} from './hooks';

export class Controller {
  constructor(props) {
    this.props = props;
    this.callbacks = new Set();
    this.hooks = createHooks(() => {       
      this.update();
      
      for (let cb of this.callbacks) {
        cb();
      }
  
      this.hooks.runEffects();
    });
    
    this.hooks.run();
    
    if (props.update) {
      this.subscribe(props.update);
    }
  }
  
  triggerUpdate() {
    this.hooks.run();
  }
  
  subscribe(fn) {
    this.callbacks.add(fn);
    return () => {
      this.callbacks.delete(fn);
    };
  }
  
  unmount() {
    this.hooks.unmount();
  }
}

export function prop(arg) {
  return {
    kind: 'method',
    key: arg.key,
    placement: 'prototype',
    descriptor: {
      get() {
        return this.props[arg.key];
      },
      set(val) {
        this.props[arg.key] = val;
        this.triggerUpdate();
      }
    }
  };
}

export function state(arg) {
  if (typeof arg === 'string') {
    return (a) => {
      return {
        kind: 'method',
        key: a.key,
        placement: 'prototype',
        descriptor: {
          get() {
            return this.state[a.key];
          },
          set(val) {
            this.state[arg](val);
          }
        }
      };
    };
  }
  
  return {
    kind: 'method',
    key: arg.key,
    placement: 'prototype',
    descriptor: {
      get() {
        return this.state[arg.key];
      }
    }
  };
}

export function method(arg) {
  return {
    kind: 'method',
    key: arg.key,
    placement: 'prototype',
    descriptor: {
      value(...args) {
        return this.state[arg.key](...args);
      }
    }
  };
}