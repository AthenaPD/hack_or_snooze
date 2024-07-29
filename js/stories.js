"use strict";

// This is the global list of the stories, an instance of StoryList
let storyList;

/** 
 * Function to update the UI buttons for stories. 
 * They should be called only when a user is logged in.
*/
function updateStoryUIWhenLoggedIn() {
  updateFavorites();
  updateRemoveButtons();
  updateEditButtons();
}

/** Get and show stories when site first loads. */

async function getAndShowStoriesOnStart() {
  storyList = await StoryList.getStories();
  $storiesLoadingMsg.remove();

  putStoriesOnPage(storyList.stories);
}

/**
 * A render method to render HTML for an individual Story instance
 * - story: an instance of Story
 *
 * Returns the markup for the story.
 */

function generateStoryMarkup(story) {
  // console.debug("generateStoryMarkup", story);

  const hostName = story.getHostName();

  return $(`
      <li id="${story.storyId}">
        <i class="fa-regular fa-star story-fav"></i>
        <a href="${story.url}" target="a_blank" class="story-link">
          ${story.title}
        </a>
        <small class="story-hostname">(${hostName})</small>
        <div class="button-right">
          <a href="#" class="story-edit hidden">edit</a>
          <button class="hidden" type="button">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
        <p class="story-author">by ${story.author}</p>
        <p class="story-user">posted by ${story.username}</p>
        <hr />
      </li>
    `);
}

/** Gets list of stories from server, generates their HTML, and puts on page. */

function putStoriesOnPage(storyArray) {
  console.debug("putStoriesOnPage");

  $allStoriesList.empty();

  // loop through all of our stories and generate HTML for them
  for (let story of storyArray) {
    const $story = generateStoryMarkup(story);
    $allStoriesList.append($story);
  }

  $allStoriesList.show();
}


/** When a user click submit on the nav bar to add a new story
 *
 * - show the story form 
 * - When story form is submitted, a post request is sent to the API
 * - the response is used to update the storyList and the current user's favorites in the DOM
 * - Ensure the UI for the stories are properly updated.
 */

// Submit a new story and add it to the story list when a user submit the story form
async function addANewStory(evt) {
  console.debug("addANewStory");
  evt.preventDefault();

  const title = $storyTitle.val();
  const author = $storyAuthor.val();
  const url = $storyUrl.val();

  await storyList.addStory(currentUser, {title, author, url});

  hidePageComponents();
  putStoriesOnPage(storyList.stories);
  updateStoryUIWhenLoggedIn();
  evt.target.reset();
}

$storyForm.on("submit", addANewStory);

function updateFavorites() {
  console.debug("updateFavorites");

  // Mark favorite stories
  for (let story of currentUser.favorites) {
    $(`#${story.storyId} i.fa-star`).removeClass("fa-regular");
    $(`#${story.storyId} i.fa-star`).addClass("fa-solid");
  }

  // Add click event listener for favoriting a story
  $("#all-stories-list li i.fa-star").on("click", handleFavorite);

}

// Add or remove a story to the current user's favorite 
function handleFavorite() {
  const clickedStoryId = $(this).parent().attr("id");
  const clickedStory = storyList.stories.find(story => story.storyId === clickedStoryId);
  const favStoryIdx = currentUser.favorites.findIndex(story => story.storyId === clickedStoryId);

  if (favStoryIdx === -1) {
    currentUser.addFavorite(clickedStory);
  }else {
    currentUser.removeFavorite(clickedStory, favStoryIdx);
  }

  $(this).toggleClass("fa-regular fa-solid");
}

/** When a user click a trash can button to remove a story
 *
 * - sent a delete request to API
 * - delete story from storyList and current user's favorite if applicable.
 */

// For logged in users, show the remove buttons
function updateRemoveButtons() {

  const $removeButtons = $("#all-stories-list li button")
  // Show remove buttons
  $removeButtons.show();

  // Add event listeners to remove a story when clicked
  $removeButtons.on("click", removeAStory);
}

function removeAStory(evt) {
  console.debug("removeAStory", evt);

  // remove the story from storyList and API
  const removeId = $(this).parents("li").attr("id");
  storyList.removeStory(currentUser, removeId);

  // If it's a favorite story, remove it from favorite list as well
  currentUser.favorites = currentUser.favorites.filter(story => story.storyId !== removeId);

  // remove the story from the DOM
  $(this).parents("li").remove();
}


/** When a user edit a story
 *
 * - show the story edit form with existing values filled in
 * - When story edit form is submitted, a patch request is sent to the API
 * - the response is used to update the storyList and the current user's favorites in the DOM
 */

// Function to call when story edit form is submitted
async function editStory(evt) {
  console.debug("editStory");
  evt.preventDefault();

  // Get the updated values for the story to be updated
  const storyId = $editStoryId.val();
  const title = $editStoryTitle.val();
  const author = $editStoryAuthor.val();
  const url = $editStoryUrl.val();

  // Call API to update the story
  const updatedStory = await storyList.editStory(
    currentUser,
    storyId,
    {title, author, url}
  )

  // Update user favorites if the updated story is a favorite
  const favStoryIdx = currentUser.favorites.findIndex(element => element.storyId === storyId);
  if (favStoryIdx !== -1) {
    currentUser.favorites[favStoryIdx] = updatedStory;
  }
}

$editStoryForm.on("submit", editStory);

function updateEditButtons() {
  // Show edit buttons for only the stories current user created
  for (let story of currentUser.ownStories) {
    const ownStoryId = story.storyId;
    const $storyEdit = $(`#${ownStoryId} div.button-right a.story-edit`)
    
    $storyEdit.show();
    $storyEdit.on("click", function() {
      hidePageComponents();
      $editStoryForm.show();
      
      $editStoryId.val(ownStoryId);
      $editStoryTitle.val(story.title);
      $editStoryAuthor.val(story.author);
      $editStoryUrl.val(story.url);
    });
  }
}


/** When a user scroll to the bottom of the page
 *
 * - get more stories from API
 * - Display more stories by appending them to the ol in the DOM
 * - scroll variable to prevent multiple firing of scroll
 */

// Load more stories when user scroll to the bottom of the page. 
async function loadMoreStories() {
  if (!scroll) {
    scroll = true;
    let htmlHeight = $(document).height();
    let scrollPosition = $(window).height() + $(window).scrollTop();
    
    // When scroll to bottom of page
    if (htmlHeight - scrollPosition < 5) {
      let numStories = storyList.stories.length;
      let moreStories = await StoryList.getStories(numStories);

      // If more stories returned from API, load them into the UI
      if (moreStories.stories.length !==0) {
        storyList.stories = storyList.stories.concat(moreStories.stories);
      
        // loop through all of our stories and generate HTML for them
        for (let story of moreStories.stories) {
          const $story = generateStoryMarkup(story);
          $allStoriesList.append($story);
        }

        updateStoryUIWhenLoggedIn();
      }
    }
    scroll = false;
  }

}

let scroll = false;
$(window).on("scroll", loadMoreStories);
