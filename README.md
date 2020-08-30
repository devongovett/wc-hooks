# wc-hooks

An experiment to try to use [React Aria](https://react-spectrum.adobe.com/react-aria/) hooks in vanilla web components
by shimming the React Hooks API.

[Demo](https://wc-hooks.vercel.app)

## Implementation strategy

The components in this example are implemented using vanilla JS – no frameworks or libraries
were used other than React Aria. The hooks API is shimmed in a ~200 line implementation that
we currently alias `react` to. Each component has a template element containing the base HTML and styles,
which is cloned into the element's shadow root in the `connectedCallback` lifecycle method.
The non-static elements are accessed using a `querySelector` and stored as instance properties.

The hooks return a set of DOM props to pass to each of these elements. This is done using
a simple ~70 line utility function that applies attributes and adds/removes event handlers. This does
a very simple diff over the props objects to only update the props that changed. Additional
attributes like classes, text content, and properties where non-string data needs to be passed, are added/removed on the element directly. After updating the DOM, effect callbacks are run.

Attributes and properties are reflected using getters and setters on the element instance. The
`attributeChangedCallback` lifecycle is used to trigger an update of the hooks to compute
new props for the DOM elements. The attributes/properties are mapped into the props object
expected by the aria hooks. In addition, event props (e.g. `onPress`/`onChange`) are added
using a small utility that fires native browser [custom events](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent). Finally, effect cleanup is done in the `disconnectCallback` lifecycle method.

Libraries like [lit-element](https://lit-element.polymer-project.org/) or
[fast-element](https://www.fast.design/docs/fast-element/getting-started) could also be used
to make parts of this a little easier (e.g. the property/attribute reflection, or the template updating), but I wanted to get some experience with the raw standards to better understand
how they worked first.

## Problems with shadow DOM

I ran into a few issues with using the existing React Aria hooks with web components, or more specifically, shadow DOM.
Some of these are fixable, but there are a few showstoppers that will likely make it impossible to use shadow DOM to build
fully accessible components today, until some future standards are available. Most of these are
not specific to React Aria's implementation, but would be applicable to any component using shadow
DOM. If you have suggestions on how these could be worked around, please let me know!

### ARIA references

The biggest showstopper issue is with ARIA id references. ARIA uses the `id` attribute to refer to elements elsewhere in the DOM.
For example, ARIA attributes such as `aria-labelledby`, `aria-describedby`, `aria-controls`, `aria-owns`, and `aria-activedescendant`
refer to other elements by id. However, when using shadow DOM, elements live within separate id spaces. This means that an element in
one shadow root cannot reference an element by id in another shadow root. All elements that need to potentially reference
each other via ARIA attributes need to be contained within a single shadow root, or in the light DOM. Practically, this is more challenging than it seems,
if not impossible.

As an example, a custom select built with ARIA looks like this:

```html
<span id="label">Favorite color</span>
<button
  aria-haspopup="listbox"
  aria-expanded="true"
  aria-labelledby="label value"
  aria-controls="listbox">
  <span id="value">Red</span>
</button>
<div class="popover">
  <button class="visually-hidden" tabIndex="-1" aria-label="Dismiss"></button>
  <ul role="listbox" id="listbox" aria-labelledby="label">
    <li role="option" aria-selected="true">Red</li>
    <li role="option">Orange</li>
    <li role="option">Yellow</li>
    <li role="option">Green</li>
    <li role="option">Blue</li>
    <li role="option">Purple</li>
  </ul>
  <button class="visually-hidden" tabIndex="-1" aria-label="Dismiss"></button>
</div>
```

Practically, it might make sense to break this into four reusable components:

1. The select element itself, including the label and the button.
2. The popover, with the styled container element and the two visually hidden dismiss buttons for mobile screen reader users.
3. The listbox, which could also be used standalone.
4. The options.

After splitting it up this way and inserting shadow roots, it might look like this:

```html
<custom-select>
  #shadow-root
    <span id="label">Favorite color</span>
    <button
      aria-haspopup="listbox"
      aria-expanded="true"
      aria-labelledby="label value"
      aria-controls="listbox">
      <span id="value">Red</span>
    </button>
    <custom-popover>
      #shadow-root
        <div class="popover">
          <button class="visually-hidden" tabIndex="-1" aria-label="Dismiss"></button>
          <custom-listbox>
            #shadow-root
              <ul role="listbox" id="listbox" aria-labelledby="label">
                <custom-option>
                  #shadow-root
                    <li role="option" aria-selected="true">Red</li>
                </custom-option>
                <!-- additional options omitted -->
              </ul>
          </custom-listbox>
          <button class="visually-hidden" tabIndex="-1" aria-label="Dismiss"></button>
        </div>
    </custom-popover>
</custom-select>
```

Breaking things up this way will make it challenging to maintain the correct
ARIA relationships. Specifically, the button needs to reference the listbox via `aria-controls`,
and the listbox needs to reference the label via `aria-labelledby`. However, this will not
actually work anymore because the references are crossing shadow DOM boundaries.
The `listbox` id does not exist in the select element's shadow root, so the reference
will be broken.

One possibility you might think of would be to actually put the ARIA attributes on
the host element, rather than on an element within the shadow root. This way other
elements can reference it. However, in the above example, that still wouldn't work
because the button needs to reference the listbox, which is actually two shadow roots
away. Additionally, this would mean that native HTML elements would need to be recreated.
For example, the `<button>` element couldn't be used within the shadow DOM, and instead
the host element would need to recreate button functionality.

The other option would be to combine components together, or have an option to each custom
element to render within a shadow DOM or not. For example, the `<custom-select>` component
could pass an option to `<custom-popover>`, `<custom-listbox>`, and `<custom-option>` to
render within the "light DOM" rather than a separate shadow DOM, and this would ensure that
everything renders within a single shadow root for the `<custom-select>` rather than as separate
shadow roots. Then all of the elements could correctly reference one another.

There are still problems though. What if the user of the `<custom-select>` wants to reference
an external label rather than using a builtin one? Typically this would be done with the
`aria-labelledby` attribute. This would need to go on the `<button>` element, which is the
focusable element with accessibility semantics. However, since the button is within a shadow
root, it could not reference the external element the user specified. The select element would
also need to be rendered in the light DOM in order for this to work correctly.

Finally, there's overflow escaping. Overlays like modals, popovers, and tooltips are often
rendered outside the element that triggered them in order to avoid being clipped by `overflow: hidden`
or scrolling. This is typically done by rendering them at the end of the document body. The structure
above may actually look more like this:

```html
<body>
  <div id="app">
    <!-- insert many levels of heirarchy here -->
    <div style="overflow: auto">
      <custom-select>
        #shadow-root
          <span id="label">Favorite color</span>
          <button
            aria-haspopup="listbox"
            aria-expanded="true"
            aria-labelledby="label value"
            aria-controls="listbox">
            <span id="value">Red</span>
          </button>
      </custom-select>
    </div>
  </div>
  <custom-popover>
    #shadow-root
      <div class="popover">
        <button class="visually-hidden" tabIndex="-1" aria-label="Dismiss"></button>
        <custom-listbox>
          #shadow-root
            <ul role="listbox" id="listbox" aria-labelledby="label">
              <custom-option>
                #shadow-root
                  <li role="option" aria-selected="true">Red</li>
              </custom-option>
              <!-- additional options omitted -->
            </ul>
        </custom-listbox>
        <button class="visually-hidden" tabIndex="-1" aria-label="Dismiss"></button>
      </div>
  </custom-popover>
</body>
```

This ensures that the popover renders outside the `overflow: auto` element, and also pops
out above the entire page in the z-index stack. However, this makes things even more challenging
for shadow DOM and accessibility. Now we don't even have the option of placing the whole component
within a single shadow root so that references can be made. The button and the listbox are
in completely different parts of the tree, but ARIA attributes still need to reference
these elements.

Until browsers provide us a way to either reference elements across shadow DOM boundaries
([AOM](https://github.com/WICG/aom/blob/gh-pages/explainer.md)) or a way to
[break out of overflow clipping with CSS](https://github.com/w3c/csswg-drafts/issues/4092),
I believe shadow DOM may make building some existing ARIA patterns practically impossible.
This includes components such as selects, combo boxes, menus, modals, popovers, tooltips, and
anything that may be labelled by or control an external element (checkboxes, switches, etc.).

### Focus management

In addition to issues with ARIA, I also ran into some issues with focus management that
affected the current implementation in React Aria. Some of these may be fixable, but in
some cases it may not be possible with current standards.

In order to implement focus management, we often need to query or walk the DOM. This is
made more difficult by shadow DOM. For example, `document.activeElement` refers to the host element containing the focused element, not the actual focused element itself. This means that, for example,
restoring focus from a dialog back to the previously recorded active element will not work
because the active element refers to the host and not the real element. Calling `element.focus()`
on this does nothing because the host is not actually focusable.

Another issue is that `querySelectorAll`, `TreeWalker`, and all other DOM querying and crawling
methods do not traverse into child shadow roots. This is problematic for focus containment,
for example, where we need to be able to find the next/previous focusable element. We also
use these to marshall focus to the focusable element within a table cell, or move focus
before/after a portaled element when the user presses `Tab`.

The `Node.contains` method is similar, and does not return true if the child element is
within a different shadow root. This is used frequently for focus management and other event
handling to check whether an event occurred within a particular element, for example.

Finally, the `disconnectedCallback` lifecycle fires *after* the element has been removed from the DOM rather than before. This means that the activeElement would have already changed if it was previously
inside the element being removed, and the function to restore focus on unmount wouldn't know.
We'd need to do our own tracking of whether focus was inside the scope in order to determine this.

Many of these could potentially be worked around by building our own DOM crawling functions
that traverse into the `shadowRoot` rather than relying on the builtin browser functions.
For example, we could get the `document.activeElement` and keep traversing through shadow
roots until we find the real active element.

However, this would only work if the shadow root is open. If an element uses
`attachShadow({mode: 'closed'})`, there will be no `shadowRoot` available on the element
to traverse into. This would mean we would potentially skip over focusable elements when
tabbing through a dialog, or not be able to restore focus back to the correct element
when a dialog closed. We can decide not to use closed shadow roots in our own components,
but we cannot control how other web components that may be on the page are written, so
this may be problematic.

### Event handling

In several of React Aria's interaction hooks, e.g. `usePress` and `useHover`, we make
use of document/window level event listeners. For example, we use global pointer events
and keyboard listeners to ensure that we correctly track mouse and keyboard events even
if the pointer or focus moves off the target element. This becomes more difficult with
shadow DOM because the `event.target` property will be set to the host element, not the
actual element that the event was fired on. We use the `event.target` to determine whether
a global event occurred on an element containing the original local target, for example.

We could potentially solve this by using [event.composedPath](https://developer.mozilla.org/en-US/docs/Web/API/Event/composedPath), but this does not work when the shadow root was created
in closed mode, so it wouldn't work for all possible cases. Registering the listeners
at the shadow root boundary rather than globally wouldn't work either, because we need to
know if the event occurred even if it is outside the shadow tree.

### Conclusion

Shadow DOM is a very cool technology, and I'm glad that the platform is considering
strong encapsulation primatives. However, I feel given the limitations described
above that it is a bit too strong too soon. Additional standards will be needed
to address these limitations, and while shadow DOM is currently nice for style
encapsulation, it currently causes more issues than it solves. Good enough style
encapsulation is possible without shadow DOM using hashed class names, for example,
so I suggest avoiding shadow DOM for the time being and sticking with custom elements
in the light DOM until these issues are addressed.
