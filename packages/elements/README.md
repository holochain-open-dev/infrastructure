# @holochain-open-dev/elements

Common elements and element related utilities to build Holochain web applications.

## Elements

### HoloIdenticon

Import it like this:

```js
import "@holochain-open-dev/elements/dist/elements/holo-identicon.js";
```

And then you can use it like this in your html:

```html
<holo-identicon
  hash="uhCEkBsnnW9JSVhGQx4AE2m0lSlWLrioEHP-7Uj4ZnbI0W-M"
></holo-identicon>
```

### DisplayError

Import it like this:

```js
import "@holochain-open-dev/elements/dist/elements/display-error.js";
```

And then you can use it like this in your html:

```html
<display-error headline="Error fetching data" error="500"></display-error>
```

### SelectAvatar

Import it like this:

```js
import "@holochain-open-dev/elements/dist/elements/select-avatar.js";
```

And then you can use it like this in your html:

```html
<select-avatar></select-avatar>
```

## Utils

### wrapPathInSvg

Function to convert paths from the [@mdi/js library](https://pictogrammers.com/library/mdi) to inline SVG sources.

Example usage:

```ts
import { mdiAlertCircleOutline } from "@mdi/js";
import { wrapPathInSvg } from '@holochain-open-dev/elements';

function  renderIcon() {
  return html`
    <sl-icon
      style="color: red; height: 64px; width: 64px;"
      src="${wrapPathInSvg(mdiAlertCircleOutline)}"
    ></sl-icon>
  `;
}
```
