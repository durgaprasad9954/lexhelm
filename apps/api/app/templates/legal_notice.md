# LEGAL NOTICE

**Date:** {{ notice_date }}

**To:**
{{ recipient_name }}
{{ recipient_address }}

**From:**
{{ sender_name }}
{{ sender_address }}
{% if sender_advocate %}Through Advocate: {{ sender_advocate }}{% endif %}

**Subject:** {{ subject }}

---

Dear {{ recipient_name }},

Under instructions from and on behalf of my client, **{{ sender_name }}**, I hereby serve upon you the following Legal Notice:

## FACTS

{{ facts }}

{% if legal_provisions %}
## LEGAL PROVISIONS

{{ legal_provisions }}
{% endif %}

## DEMAND

{{ demand }}

## NOTICE

You are hereby called upon to comply with the above demand within **{{ reply_deadline_days | default("15") }} days** from the date of receipt of this notice, failing which my client shall be constrained to initiate appropriate legal proceedings against you at your risk, cost, and consequences.

This notice is issued without prejudice to the rights and remedies of my client under law.

---

**{{ sender_name }}**
{% if sender_advocate %}
Through: {{ sender_advocate }}
Advocate
{% endif %}
