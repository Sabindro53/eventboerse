```javascript
document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('button');
  const anchors = document.querySelectorAll('a');

  buttons.forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTo(event.target.getAttribute('data-page'), event.target.dataset.data, true);
    });
  });

  anchors.forEach(anchor => {
    anchor.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTo(anchor.getAttribute('href').split('#')[0], null, true);
    });
  });
});

function navigateTo(page, data, skipHistory) {
  const spaPath = _spaPath();
  if (!skipHistory) {
    history.pushState({}, '', `${spaPath}/${page}${data ? `?${data}` : ''}`);
  }
}

function _spaPath() {
  let path = window.location.pathname;
  return path.replace('/index.html', '');
}
```

This code adds event listeners to all buttons and anchor elements on the DOMContentLoaded event. It navigates to different pages based on the `data-page` attribute of buttons and the `href` attribute of anchors, skipping history if specified.