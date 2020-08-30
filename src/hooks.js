let currentStore;
let currentDispatcher;
let index = 0;
let effects;
let layoutEffects;
let unmountEffects;

export function createHooks(fn) {
  let store = [];
  let _effects = [];
  let _layoutEffects = [];
  let _unmountEffects = [];

  let isUpdating = false;
  let updateQueued = false;
  let update = () => {
    if (isUpdating) {
      updateQueued = true;
      return;
    }

    currentStore = store;
    currentDispatcher = update;
    index = 0;
    effects = _effects;
    layoutEffects = _layoutEffects;
    unmountEffects = _unmountEffects;
    isUpdating = true;

    fn();

    currentStore = null;
    currentDispatcher = null;
    index = 0;
    effects = null;
    layoutEffects = null;
    unmountEffects = null;
    isUpdating = false;

    if (updateQueued) {
      updateQueued = false;
      update();
    }
  };

  let runEffects = () => {
    _layoutEffects.forEach(fn => fn());
    _layoutEffects = [];

    requestAnimationFrame(() => {
      _effects.forEach(fn => fn());
      _effects = [];
    });
  };

  let unmount = () => {
    _unmountEffects.forEach(fn => fn());
  };

  return {
    run: update,
    runEffects,
    unmount
  };
}

export function useReducer(reducer, initialArg, init) {
  if (!currentStore) {
    throw new Error('Hook called not in a component');
  }

  let store = currentStore;
  let update = currentDispatcher;
  let i = index++;

  if (store.length <= i) {
    let initialValue = initialArg;
    if (typeof init === 'function') {
      initialValue = init(initialArg);
    }

    let dispatch = action => {
      let prev = store[i][0];
      let nextState = reducer(prev, action);
      if (nextState === prev) {
        return;
      }


      store[i] = [nextState, dispatch];
      update();
    };

    store[i] = [initialValue, dispatch];
  }

  return store[i];
}

export function useState(initialValue) {
  return useReducer((cur, next) => {
    if (typeof next === 'function') {
      next = next(cur);
    }

    return next;
  }, initialValue);
}

export function useMemo(fn, deps) {
  if (!currentStore) {
    throw new Error('Hook called not in a component');
  }

  let store = currentStore;
  let i = index++;

  if (store.length <= i) {
    let val = fn();
    store[i] = [val, deps];
    return val;
  } else {
    let [prev, prevDeps] = store[i];
    if (!shallowEqualArrays(prevDeps, deps)) {
      let val = fn();
      store[i] = [val, deps];
      return val;
    } else {
      return prev;
    }
  }
}

function shallowEqualArrays(a, b) {
  if (a.length !== b.length) {
    return false;
  }

  return a.every((v, i) => b[i] === v);
}

function _useEffectWithQueue(fn, deps, queue) {
  if (!currentStore) {
    throw new Error('Hook called not in a component');
  }

  let store = currentStore;
  let i = index++;

  if (store.length <= i) {
    queue.push(() => {
      let res = fn();
      if (typeof res === 'function') {
        store[i][0] = res;
      }
    });
    store[i] = [null, deps];

    unmountEffects.push(() => {
      if (store[i][0]) {
        store[i][0]();
      }
    });
  } else {
    let [prevFn, prevDeps] = store[i];
    if (!prevDeps || !deps || !shallowEqualArrays(prevDeps, deps)) {
      if (prevFn) queue.push(prevFn);
      queue.push(() => {
        let res = fn();
        if (typeof res === 'function') {
          store[i][0] = res;
        }
      });
      store[i] = [null, deps];
    }
  }
}

export function useEffect(fn, deps) {
  _useEffectWithQueue(fn, deps, effects);
}

export function useLayoutEffect(fn, deps) {
  _useEffectWithQueue(fn, deps, layoutEffects);
}

export function useRef(initialValue) {
  let [v] = useState({current: initialValue});
  return v;
}

export function useContext(context) {
  // TODO
  context;
}

export function useCallback(cb, deps) {
  return useMemo(() => cb, deps);
}

export function createContext() {
  return {}
}

export function forwardRef() {}

export default {
  createContext,
  forwardRef,
  isValidElement(v) { return !!v;},
  Children: {
    forEach(children, fn) {
      children.forEach(fn);
    }
  }
}
