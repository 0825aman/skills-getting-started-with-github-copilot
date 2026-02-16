// Constants
const MESSAGE_AUTO_HIDE_DELAY = 5000;

// Helper function to create activity card content
function createActivityCardContent(name, description, schedule, spotsLeft) {
  const fragment = document.createDocumentFragment();
  
  const title = document.createElement("h4");
  title.textContent = name;
  fragment.appendChild(title);
  
  const desc = document.createElement("p");
  desc.textContent = description;
  fragment.appendChild(desc);
  
  const scheduleP = document.createElement("p");
  const scheduleStrong = document.createElement("strong");
  scheduleStrong.textContent = "Schedule: ";
  scheduleP.appendChild(scheduleStrong);
  scheduleP.appendChild(document.createTextNode(schedule));
  fragment.appendChild(scheduleP);
  
  const availability = document.createElement("p");
  const availStrong = document.createElement("strong");
  availStrong.textContent = "Availability: ";
  availability.appendChild(availStrong);
  availability.appendChild(document.createTextNode(`${spotsLeft} spots left`));
  fragment.appendChild(availability);
  
  return fragment;
}

// Global function to render activities (used by both initial load and updates)
function renderActivities(activities) {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");

  // Clear activities list
  activitiesList.innerHTML = "";
  
  // Clear existing options except first
  while (activitySelect.options.length > 1) {
    activitySelect.remove(1);
  }

  Object.entries(activities).forEach(([name, details]) => {
    const activityCard = document.createElement("div");
    activityCard.className = "activity-card";

    const spotsLeft = details.max_participants - details.participants.length;

    // Create activity card with participants if present
    if (details.participants.length > 0) {
      // Create participants section
      const participantsSection = document.createElement("div");
      participantsSection.className = "participants-section";
      
      const participantsTitle = document.createElement("strong");
      participantsTitle.textContent = "Participants:";
      participantsSection.appendChild(participantsTitle);
      
      const participantsList = document.createElement("ul");
      participantsList.className = "participants-list";
      
      details.participants.forEach((email) => {
        const li = document.createElement("li");
        
        const span = document.createElement("span");
        span.textContent = email;
        li.appendChild(span);
        
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "delete-btn";
        deleteBtn.textContent = "✕";
        deleteBtn.dataset.activityName = name;
        deleteBtn.dataset.email = email;
        li.appendChild(deleteBtn);
        
        participantsList.appendChild(li);
      });
      
      participantsSection.appendChild(participantsList);
      
      // Add card content with participants section
      activityCard.appendChild(createActivityCardContent(name, details.description, details.schedule, spotsLeft));
      activityCard.appendChild(participantsSection);
    } else {
      // No participants - just add card content
      activityCard.appendChild(createActivityCardContent(name, details.description, details.schedule, spotsLeft));
    }

    activitiesList.appendChild(activityCard);

    // Add option to select dropdown
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    activitySelect.appendChild(option);
  });
}

// Function to fetch activities from API
async function fetchActivities() {
  const activitiesList = document.getElementById("activities-list");
  try {
    const response = await fetch("/activities");
    const activities = await response.json();
    renderActivities(activities);
  } catch (error) {
    // Clear and show error message using DOM manipulation
    activitiesList.innerHTML = "";
    const errorMsg = document.createElement("p");
    errorMsg.textContent = "Failed to load activities. Please try again later.";
    activitiesList.appendChild(errorMsg);
    console.error("Error fetching activities:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activitiesList = document.getElementById("activities-list");

  // Handle unregister button clicks using event delegation
  activitiesList.addEventListener("click", async (event) => {
    if (event.target.classList.contains("delete-btn")) {
      const activityName = event.target.dataset.activityName;
      const email = event.target.dataset.email;
      
      try {
        const response = await fetch(
          `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
          {
            method: "DELETE",
          }
        );

        const result = await response.json();

        if (response.ok) {
          messageDiv.textContent = result.message;
          messageDiv.className = "success";
          messageDiv.classList.remove("hidden");

          // Hide message after delay
          setTimeout(() => {
            messageDiv.classList.add("hidden");
          }, MESSAGE_AUTO_HIDE_DELAY);

          // Refresh the activities list
          await fetchActivities();
        } else {
          messageDiv.textContent = result.detail || "Failed to unregister";
          messageDiv.className = "error";
          messageDiv.classList.remove("hidden");

          setTimeout(() => {
            messageDiv.classList.add("hidden");
          }, MESSAGE_AUTO_HIDE_DELAY);
        }
      } catch (error) {
        messageDiv.textContent = "Failed to unregister. Please try again.";
        messageDiv.className = "error";
        messageDiv.classList.remove("hidden");
        console.error("Error unregistering:", error);
      }
    }
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities to show updated participant list
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after delay
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, MESSAGE_AUTO_HIDE_DELAY);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
