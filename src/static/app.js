// Constants
const MESSAGE_AUTO_HIDE_DELAY = 5000;

// Helper function to escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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

    // Build participants list
    let participantsHTML = "";
    if (details.participants.length > 0) {
      participantsHTML = `
        <div class="participants-section">
          <strong>Participants:</strong>
          <ul class="participants-list">
            ${details.participants
              .map(
                (email) => {
                  const escapedName = escapeHtml(name);
                  const escapedEmail = escapeHtml(email);
                  return `
              <li>
                <span>${escapedEmail}</span>
                <button class="delete-btn" onclick="unregisterParticipant('${escapedName}', '${escapedEmail}')">✕</button>
              </li>
            `;
                }
              )
              .join("")}
          </ul>
        </div>
      `;
    }

    activityCard.innerHTML = `
      <h4>${escapeHtml(name)}</h4>
      <p>${escapeHtml(details.description)}</p>
      <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
      <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
      ${participantsHTML}
    `;

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
    activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
    console.error("Error fetching activities:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

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

// Global function to unregister a participant
async function unregisterParticipant(activityName, email) {
  try {
    const response = await fetch(
      `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();
    const messageDiv = document.getElementById("message");

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
    const messageDiv = document.getElementById("message");
    messageDiv.textContent = "Failed to unregister. Please try again.";
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    console.error("Error unregistering:", error);
  }
}
