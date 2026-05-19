function navigateTo(path, params = null) {
  const url = new URL(window.location.origin + window.location.pathname);
  if (params) {
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  }
  window.history.pushState({}, '', path);
  const routes = {
    'home': () => navigateTo('/'),
    'browse': () => navigateTo('/listings'),
    'detail/:id': (id) => navigateTo(`/listings/${id}`),
    'chat/:userId': (userId) => navigateTo(`/conversations/${userId}`),
    'board': () => navigateTo('/event-planner-board'),
    'profile': () => navigateTo('/profile'),
    'settings': () => navigateTo('/settings'),
    'admin': () => navigateTo('/admin')
  };
  routes[path]();
}

// Example usage:
navigateTo('detail', 123); // Navigate to /listings/123