/* Dani Baki — single page site behaviour
   - stamps the hidden _page field with the current URL
   - client-side validation with visible, accessible errors
   - fetch submission to the same POST endpoint, with a plain-form fallback
   - shows the confirmation when ?submitted=1 is present
*/
(function () {
  'use strict';

  var form = document.getElementById('quote-form');
  var confirmBox = document.getElementById('form-confirm');
  var pageField = document.getElementById('form-page');
  var yearEl = document.getElementById('year');

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* --- hidden _page field: where the visitor should return to --- */
  if (pageField) {
    pageField.value = window.location.href;
  }

  /* --- show confirmation after a plain (non-JS) submission --- */
  function showConfirmation(scroll) {
    if (!confirmBox) return;
    confirmBox.hidden = false;
    if (form) form.hidden = true;
    if (scroll) {
      try {
        confirmBox.scrollIntoView({ block: 'center' });
      } catch (e) {
        confirmBox.scrollIntoView();
      }
      confirmBox.setAttribute('tabindex', '-1');
      confirmBox.focus();
    }
  }

  var params = new URLSearchParams(window.location.search);
  if (params.get('submitted') === '1') {
    showConfirmation(true);
  }

  if (!form) return;

  /* --- validation helpers --- */
  function clearError(field) {
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
    var existing = document.getElementById(field.id + '-error');
    if (existing) existing.parentNode.removeChild(existing);
  }

  function setError(field, message) {
    clearError(field);
    var msg = document.createElement('span');
    msg.className = 'field-error';
    msg.id = field.id + '-error';
    msg.textContent = message;
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', msg.id);
    field.parentNode.appendChild(msg);
  }

  function clearSummary() {
    var s = document.getElementById('form-error-summary');
    if (s) s.parentNode.removeChild(s);
  }

  function setSummary(text) {
    clearSummary();
    var box = document.createElement('p');
    box.className = 'form-error-summary';
    box.id = 'form-error-summary';
    box.setAttribute('role', 'alert');
    box.textContent = text;
    form.insertBefore(box, form.querySelector('.form-title'));
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function validate() {
    var problems = [];
    var checks = [
      { el: document.getElementById('name'), msg: 'Please enter your name.' },
      { el: document.getElementById('email'), msg: 'Please enter your email address.' },
      { el: document.getElementById('message'), msg: 'Please tell us what you need.' }
    ];

    checks.forEach(function (check) {
      var el = check.el;
      if (!el) return;
      clearError(el);
      if (!el.value.trim()) {
        setError(el, check.msg);
        problems.push(el);
      }
    });

    var email = document.getElementById('email');
    if (email && email.value.trim() && !EMAIL_RE.test(email.value.trim())) {
      setError(email, 'Please enter a valid email address, like name@example.com.');
      problems.push(email);
    }

    return problems;
  }

  /* --- submit --- */
  form.addEventListener('submit', function (event) {
    if (pageField) pageField.value = window.location.href;

    var problems = validate();
    if (problems.length) {
      event.preventDefault();
      setSummary('Please check the highlighted fields and try again.');
      problems[0].focus();
      return;
    }
    clearSummary();

    // Honeypot filled in: it's a bot. Stop quietly without posting.
    var pot = form.querySelector('input[name="_gotcha"]');
    if (pot && pot.value) {
      event.preventDefault();
      showConfirmation(false);
      return;
    }

    if (typeof window.fetch !== 'function' || typeof FormData !== 'function') {
      return; // let the plain HTML POST happen
    }

    event.preventDefault();

    var button = form.querySelector('button[type="submit"]');
    var originalLabel = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }

    var payload = {};
    new FormData(form).forEach(function (value, key) {
      payload[key] = typeof value === 'string' ? value : String(value);
    });
    payload._page = window.location.href;

    fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (response) {
        if (!response.ok) throw new Error('Request failed with status ' + response.status);
        return response.json().catch(function () { return { ok: true }; });
      })
      .then(function (data) {
        if (data && data.ok === false) throw new Error('Submission rejected');
        showConfirmation(true);
      })
      .catch(function () {
        if (button) {
          button.disabled = false;
          button.textContent = originalLabel;
        }
        setSummary('Sorry, something went wrong sending your request. Please try again.');
      });
  });

  /* --- clear a field's error as soon as the visitor fixes it --- */
  ['name', 'email', 'message'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      if (el.getAttribute('aria-invalid') === 'true' && el.value.trim()) clearError(el);
    });
  });
})();
