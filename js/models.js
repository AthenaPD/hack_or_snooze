"use strict";

const BASE_URL = "https://hack-or-snooze-v3.herokuapp.com";

/******************************************************************************
 * Story: a single story in the system
 */

class Story {

  /** Make instance of Story from data object about story:
   *   - {title, author, url, username, storyId, createdAt}
   */

  constructor({ storyId, title, author, url, username, createdAt }) {
    this.storyId = storyId;
    this.title = title;
    this.author = author;
    this.url = url;
    this.username = username;
    this.createdAt = createdAt;
  }

  /** Parses hostname out of URL and returns it. */

  getHostName() {
    // UNIMPLEMENTED: complete this function!
    return "hostname.com";
  }
}


/******************************************************************************
 * List of Story instances: used by UI to show story lists in DOM.
 */

class StoryList {
  constructor(stories) {
    this.stories = stories;
  }

  /** Generate a new StoryList. It:
   *
   *  - calls the API
   *  - builds an array of Story instances
   *  - makes a single StoryList instance out of that
   *  - returns the StoryList instance.
   */

  static async getStories(skip=0) {
    // Note presence of `static` keyword: this indicates that getStories is
    //  **not** an instance method. Rather, it is a method that is called on the
    //  class directly. Why doesn't it make sense for getStories to be an
    //  instance method?

    // query the /stories endpoint (no auth required)
    const response = await axios({
      url: `${BASE_URL}/stories`,
      method: "GET",
      params: {limit: 10, skip}
    });

    // turn plain old story objects from API into instances of Story class
    const stories = response.data.stories.map(story => new Story(story));

    // build an instance of our own class using the new array of stories
    return new StoryList(stories);
  }

  /** Adds story data to API, makes a Story instance, adds it to story list.
   * - user - the current instance of User who will post the story
   * - obj of {title, author, url}
   *
   * Returns the new Story instance
   */

  async addStory(user, newStory) {
    const story = newStory;
    const token = user.loginToken;

    const response = await axios.post(`${BASE_URL}/stories`, {token, story});
    
    const newStoryInst = new Story({
      storyId: response.data.story.storyId,
      title: response.data.story.title,
      author: response.data.story.author,
      url: response.data.story.url,
      username: response.data.story.username,
      createdAt: response.data.story.createdAt});

    this.stories.unshift(newStoryInst);

    return newStoryInst
  }

  async removeStory(user, removeId) {
    // Remove the story from the storyList
    const removeIdx = this.stories.findIndex(story => story.storyId === removeId);
    this.stories.splice(removeIdx, 1);

    // Update the API
    await axios.delete(
      `${BASE_URL}/stories/${removeId}`, 
      {params: {token: user.loginToken}}
    );
  }

  async editStory(user, storyId, editFields) {
    // Send patch request to edit story
    const response = await axios.patch(
      `${BASE_URL}/stories/${storyId}`, 
      {token: user.loginToken, story: editFields}
    );

    // update storyList
    const storyIdx = this.stories.findIndex(element => element.storyId === storyId);
    let updatedStory = response.data.story;
    delete updatedStory["updatedAt"];
    this.stories[storyIdx] = new Story(updatedStory);

    return this.stories[storyIdx]
  }
}


/******************************************************************************
 * User: a user in the system (only used to represent the current user)
 */

class User {
  /** Make user instance from obj of user data and a token:
   *   - {username, name, createdAt, favorites[], ownStories[]}
   *   - token
   */

  constructor({
                username,
                name,
                createdAt,
                favorites = [],
                ownStories = []
              },
              token) {
    this.username = username;
    this.name = name;
    this.createdAt = createdAt;

    // instantiate Story instances for the user's favorites and ownStories
    this.favorites = favorites.map(s => new Story(s));
    this.ownStories = ownStories.map(s => new Story(s));

    // store the login token on the user so it's easy to find for API calls.
    this.loginToken = token;
  }

  /** Register new user in API, make User instance & return it.
   *
   * - username: a new username
   * - password: a new password
   * - name: the user's full name
   */

  static async signup(username, password, name) {
    try {
      const response = await axios({
        url: `${BASE_URL}/signup`,
        method: "POST",
        data: { user: { username, password, name } },
      });

      let { user } = response.data

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        response.data.token
      );
    }catch(err) {
      alert(err.response.data.error.message);
      return null;
    }
  }

  /** Login in user with API, make User instance & return it.

   * - username: an existing user's username
   * - password: an existing user's password
   */

  static async login(username, password) {
    try {
      const response = await axios({
        url: `${BASE_URL}/login`,
        method: "POST",
        data: { user: { username, password } },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        response.data.token
      );
    } catch (err) {
      alert(err.response.data.error.message);
      return null;
    }
  }

  /** When we already have credentials (token & username) for a user,
   *   we can log them in automatically. This function does that.
   */

  static async loginViaStoredCredentials(token, username) {
    try {
      const response = await axios({
        url: `${BASE_URL}/users/${username}`,
        method: "GET",
        params: { token },
      });

      let { user } = response.data;

      return new User(
        {
          username: user.username,
          name: user.name,
          createdAt: user.createdAt,
          favorites: user.favorites,
          ownStories: user.stories
        },
        token
      );
    } catch (err) {
      console.error("loginViaStoredCredentials failed", err);
      return null;
    }
  }

  // Add a story as favorite
  async addFavorite(story) {
    // Update the current user object in the DOM
    this.favorites.push(story);

    // Update the user preference on the API side so that it persists even after refreshing the page
    await axios.post(
      `${BASE_URL}/users/${currentUser.username}/favorites/${story.storyId}`, 
      {token: currentUser.loginToken}
    );
  }

  // Remove a story from the array of favorite stories
  async removeFavorite(story, storyIdx) {
    // delete the story from current user's favorite list
    this.favorites.splice(storyIdx, 1);

    // Update the user preference on the API side so that it persists even after refreshing the page
    await axios.delete(
      `${BASE_URL}/users/${currentUser.username}/favorites/${story.storyId}`, 
      {params: {token: currentUser.loginToken}}
    );
  }

  async editInfo(name, password) {

    const newInfo = password === '' ? {name} : {name, password};
    const response = await axios.patch(
      `${BASE_URL}/users/${this.username}`,
      {token: this.loginToken, user: newInfo}
    );

    console.log(response);

    const updatedUser = response.data.user;

    return new User({
        username: updatedUser.username,
        name: updatedUser.name,
        createdAt: updatedUser.createdAt,
        favorites: updatedUser.favorites,
        ownStories: updatedUser.stories
      },
      this.loginToken
    );
  }
}
