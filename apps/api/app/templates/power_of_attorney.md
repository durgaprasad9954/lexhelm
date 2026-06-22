# POWER OF ATTORNEY

**Date:** {{ effective_date }}

## KNOW ALL MEN BY THESE PRESENTS

I, **{{ principal_name }}**{% if principal_address %}, residing at {{ principal_address }}{% endif %} (hereinafter referred to as the "Principal"), do hereby appoint and constitute **{{ agent_name }}**{% if agent_address %}, residing at {{ agent_address }}{% endif %} (hereinafter referred to as the "Attorney/Agent"), as my true and lawful attorney to act on my behalf in the following matters:

## POWERS GRANTED

{{ powers_granted }}

## TERMS AND CONDITIONS

1. This Power of Attorney shall be effective from **{{ effective_date }}**{% if expiry_date %} and shall remain valid until **{{ expiry_date }}**{% else %} and shall remain valid until revoked by the Principal{% endif %}.
{% if revocable is defined and not revocable %}
2. This Power of Attorney is **irrevocable** for the duration specified.
{% else %}
2. This Power of Attorney is **revocable** at any time by the Principal through written notice.
{% endif %}
3. The Attorney shall act in good faith and in the best interest of the Principal.
4. The Attorney shall not delegate the powers conferred herein to any third party.
5. All acts done by the Attorney within the scope of this Power of Attorney shall be binding on the Principal.

## DUTIES OF THE ATTORNEY

The Attorney shall act honestly, in good faith, and only within the powers expressly granted herein. The Attorney shall maintain proper records of material acts done on behalf of the Principal and shall not use the authority conferred for personal benefit inconsistent with the interests of the Principal.

{% if scope_limitations %}
## LIMITATIONS

{{ scope_limitations }}
{% endif %}

## GOVERNING LAW

This Power of Attorney shall be interpreted in accordance with the applicable laws of India and any competent local jurisdiction relevant to its execution and use.

---

**IN WITNESS WHEREOF**, I have signed this Power of Attorney on **{{ effective_date }}**.

**PRINCIPAL:**
Name: {{ principal_name }}
Signature: _________________

**ACCEPTED BY ATTORNEY:**
Name: {{ agent_name }}
Signature: _________________

**WITNESSES:**
1. Name: _________________ Signature: _________________
2. Name: _________________ Signature: _________________
