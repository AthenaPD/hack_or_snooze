"use strict";

/******************************************************************************
 * Handling navbar clicks and updating navbar
 */

/** Show main list of all stories when click site name */

function navAllStories(evt) {
  console.debug("navAllStories", evt);
  hidePageComponents();
  putStoriesOnPage(storyList.stories);
  if (currentUser) updateStoryUIWhenLoggedIn(); 
}

$body.on("click", "#nav-all", navAllStories);

/** Show login/signup on click on "login" */

function navLoginClick(evt) {
  console.debug("navLoginClick", evt);
  hidePageComponents();
  $loginForm.show();
  $signupForm.show();
}

$navLogin.on("click", navLoginClick);

/** When a user first logins in, update the navbar to reflect that. */

function updateNavOnLogin() {
  console.debug("updateNavOnLogin");
  $navLogin.hide();
  $navLogOut.show();
  $navUserProfile.text(`${currentUser.username}`).show();
  $navSubmit.show();
  $navFavorites.show();
}

// For user to submit a new story
function submitAStory(evt) {
  console.debug("submitAStory", evt);
  hidePageComponents();
  $storyForm.show();
}

$navSubmit.on("click", submitAStory);

// For logged in user to see only their favorite stories
async function showFavorites(evt) {
  console.debug("ShowFavorites", evt);
  
  hidePageComponents();
  putStoriesOnPage(currentUser.favorites);
  updateStoryUIWhenLoggedIn();
}

$navFavorites.on("click", showFavorites);

/*********************************************************************
 * When a user click his/her own username, a form shows up for them to edit his/her info
 */

function showUserEditForm() {
  console.debug("showUserEditForm");

  hidePageComponents();
  $userEditForm.show();

  $editName.val(currentUser.name);
  $editUsername.val(currentUser.username);
}

$navUserProfile.on("click", showUserEditForm)
