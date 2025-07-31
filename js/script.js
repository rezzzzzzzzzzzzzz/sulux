// Get references to form elements
const form = document.getElementById('clipper-form');
const submitButton = document.getElementById('submit-button');
const resetButton = document.getElementById('reset-button');
const statusMessage = document.getElementById('status-message');
const urlInput = document.getElementById('url-input');
const noteInput = document.getElementById('note-input');
const fileInput = document.getElementById('file-input');
const urlFeedback = document.getElementById('url-feedback');

// Helper function to update status message with animation
function updateStatusMessage(text, className = '') {
  // Reset animation
  statusMessage.style.animation = 'none';
  
  // Update content
  statusMessage.textContent = text;
  statusMessage.className = className;
  
  // Trigger animation after a brief delay to ensure reset takes effect
  setTimeout(() => {
    statusMessage.style.animation = 'fadeIn 0.5s ease-in-out';
  }, 10);
}

// Real-time URL validation
function validateUrl(url) {
  if (!url || url.trim() === '') {
    urlInput.classList.remove('valid', 'invalid');
    urlFeedback.textContent = '';
    return true; // Empty is valid (optional field)
  }
  
  try {
    new URL(url);
    urlInput.classList.remove('invalid');
    urlInput.classList.add('valid');
    urlFeedback.textContent = '✓ Valid URL';
    urlFeedback.style.color = '#51cf66';
    return true;
  } catch (error) {
    urlInput.classList.remove('valid');
    urlInput.classList.add('invalid');
    urlFeedback.textContent = '✗ Invalid URL format';
    urlFeedback.style.color = '#ff6b6b';
    return false;
  }
}

// Add real-time URL validation
urlInput.addEventListener('input', (event) => {
  validateUrl(event.target.value);
});

urlInput.addEventListener('blur', (event) => {
  validateUrl(event.target.value);
});

// Reset button functionality
resetButton.addEventListener('click', () => {
  form.reset();
  urlInput.classList.remove('valid', 'invalid');
  urlFeedback.textContent = '';
  updateStatusMessage('');
  // Reset spinner and button state
  const spinner = document.querySelector('.loading-spinner');
  submitButton.disabled = false;
  submitButton.style.display = 'block';
  spinner.style.display = 'none';
});

// Add submit event listener to the form (handles both button clicks and Enter key)
form.addEventListener('submit', (event) => {
  // Prevent default form submission
  event.preventDefault();
  
  // Disable submit button and update UI with loading spinner
  const spinner = document.querySelector('.loading-spinner');
  submitButton.disabled = true;
  submitButton.style.display = 'none';
  spinner.style.display = 'block';
  updateStatusMessage('Sending to Telegram...', 'info');

  // Get form field references for validation
  const urlInputValue = urlInput.value;
  const noteInputValue = noteInput.value;
  const fileInputValue = fileInput.files;

  // Client-side validation: Check if all fields are empty
  const isUrlEmpty = urlInputValue.trim() === '';
  const isNoteEmpty = noteInputValue.trim() === '';
  const isFileEmpty = !fileInputValue.length;

  if (isUrlEmpty && isNoteEmpty && isFileEmpty) {
    // All fields are empty - prevent submission
    updateStatusMessage('Please provide at least one field', 'error');
    const spinner = document.querySelector('.loading-spinner');
    submitButton.disabled = false;
    submitButton.style.display = 'block';
    spinner.style.display = 'none';
    return;
  }

  // Validate URL if provided
  if (!isUrlEmpty && !validateUrl(urlInputValue)) {
    updateStatusMessage('Please enter a valid URL', 'error');
    const spinner = document.querySelector('.loading-spinner');
    submitButton.disabled = false;
    submitButton.style.display = 'block';
    spinner.style.display = 'none';
    return;
  }

  // Create FormData object from the form
  const formData = new FormData(event.target);
  
  // Fetch to the Cloudflare Worker (actual deployed URL)
  fetch('https://tele-clipper-worker.poxmaadani.workers.dev', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    } else {
      return response.json().then(data => {
        throw new Error(data.error || 'Server error');
      });
    }
  })
  .then(json => {
    if (json.success) {
      // Success case
      updateStatusMessage('Success!', 'success');
      event.target.reset(); // Clear the form
      const spinner = document.querySelector('.loading-spinner');
      submitButton.disabled = false;
      submitButton.style.display = 'block';
      spinner.style.display = 'none';
    } else {
      // API returned success: false
      updateStatusMessage(json.error, 'error');
      const spinner = document.querySelector('.loading-spinner');
      submitButton.disabled = false;
      submitButton.style.display = 'block';
      spinner.style.display = 'none';
    }
  })
  .catch(error => {
    // Network error or other fetch errors
    updateStatusMessage('Network error: Could not reach the server', 'error');
    const spinner = document.querySelector('.loading-spinner');
    submitButton.disabled = false;
    submitButton.style.display = 'block';
    spinner.style.display = 'none';
  });
});

// Additional keyboard accessibility for the submit button
submitButton.addEventListener('keydown', (event) => {
  // Handle Enter and Space keys for button activation
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    // Trigger form submission
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
});

// Ensure proper focus management for accessibility
form.addEventListener('keydown', (event) => {
  // Allow form submission via Enter key from any input
  if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
    // Don't prevent Enter in textarea (allows line breaks)
    // Form submit event will handle the submission
  }
});
