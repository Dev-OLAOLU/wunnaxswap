/**
 * Optional EmailJS config for custom branded OTP emails.
 *
 * Free setup (~2 min): https://www.emailjs.com/
 *  1. Create account → Email Service (Gmail / Outlook / etc.)
 *  2. Create template with variables: {{to_email}}, {{reset_code}}, {{message}}
 *  3. Copy Service ID, Template ID, Public Key below
 *
 * If left empty, recovery still works via FormSubmit + Firebase Auth email.
 */
(function () {
  window.WUNNAX_EMAILJS = {
    serviceId: "", // e.g. "service_xxxxxxx"
    templateId: "", // e.g. "template_xxxxxxx"
    publicKey: "", // e.g. "xxxxxxxxxxxx"
  };
})();
