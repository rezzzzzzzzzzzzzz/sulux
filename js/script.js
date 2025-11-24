// Password protection configuration
let userPassword = ''; // Store password in memory after authentication

// Password protection elements
const passwordOverlay = document.getElementById('password-overlay');
const passwordForm = document.getElementById('password-form');
const passwordInput = document.getElementById('password-input');
const passwordSubmit = document.getElementById('password-submit');
const passwordError = document.getElementById('password-error');

// Check if user is already authenticated
function checkAuthentication() {
  const isAuthenticated = sessionStorage.getItem('teleClipperAuth') === 'true';
  const storedPassword = sessionStorage.getItem('teleClipperPassword');
  if (isAuthenticated && storedPassword) {
    userPassword = storedPassword;
    passwordOverlay.classList.add('hidden');
  }
}

// Handle password form submission
passwordForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  
  const enteredPassword = passwordInput.value.trim();
  
  if (!enteredPassword) {
    passwordError.textContent = '❌ Please enter a password.';
    passwordInput.focus();
    return;
  }
  
  // Show loading state
  passwordSubmit.disabled = true;
  passwordSubmit.textContent = '🔄 Verifying...';
  
  // Simply store the password and unlock without server verification
  // The password will be verified on actual form submission
  userPassword = enteredPassword;
  sessionStorage.setItem('teleClipperAuth', 'true');
  sessionStorage.setItem('teleClipperPassword', enteredPassword);
  
  passwordOverlay.style.animation = 'fadeOut 0.5s ease-out forwards';
  
  setTimeout(() => {
    passwordOverlay.classList.add('hidden');
  }, 500);
  
  passwordError.textContent = '';
  passwordInput.classList.remove('error');
  
  // Reset button state
  passwordSubmit.disabled = false;
  passwordSubmit.textContent = '💀 Unlock';
});

// Focus password input when overlay is shown
passwordInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    passwordForm.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  }
});

// Add fadeOut animation
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from { opacity: 1; transform: scale(1); }
    to { opacity: 0; transform: scale(0.9); }
  }
`;
document.head.appendChild(style);

// Initialize authentication check
checkAuthentication();

// Focus password input initially
setTimeout(() => {
  if (!passwordOverlay.classList.contains('hidden')) {
    passwordInput.focus();
  }
}, 500);

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
  
  // Add the authenticated password to the form data
  if (userPassword) {
    formData.append('password', userPassword);
  } else {
    updateStatusMessage('Authentication error. Please refresh and try again.', 'error');
    const spinner = document.querySelector('.loading-spinner');
    submitButton.disabled = false;
    submitButton.style.display = 'block';
    spinner.style.display = 'none';
    return;
  }
  
  // Fetch to the Cloudflare Worker (actual deployed URL)
  fetch('https://tele-clipper-worker.poxmaadani.workers.dev', {
    method: 'POST',
    body: formData
  })
  .then(response => {
    if (response.ok) {
      return response.json();
    } else if (response.status === 401) {
      // Authentication failed - clear session and show password overlay
      sessionStorage.removeItem('teleClipperAuth');
      sessionStorage.removeItem('teleClipperPassword');
      userPassword = '';
      passwordOverlay.classList.remove('hidden');
      passwordInput.focus();
      throw new Error('Authentication failed. Please enter your password again.');
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
