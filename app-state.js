class AppState {
  constructor() {
    this.state = {
      currentPage: 'home',
      listings: [],
      providerDetails: {},
      searchQuery: '',
      favorites: [],
      chatMessages: {},
      messages: [],
      myListings: [],
      boardProjects: [],
      boardSettings: {
        viewMode: 'kanban'
      },
      sidebarOpen: false,
      isAppLoaderVisible: true
    };
  }

  setCurrentPage(page) {
    this.state.currentPage = page;
  }

  setState(key, value) {
    this.state[key] = value;
  }

  getState() {
    return this.state;
  }
}

export default new AppState();