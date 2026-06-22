# NON-DISCLOSURE AGREEMENT

This Non-Disclosure Agreement ("Agreement") is entered into as of **{{ effective_date }}**.

## BETWEEN

**Disclosing Party:** {{ disclosing_party }}
{% if disclosing_party_address %}Address: {{ disclosing_party_address }}{% endif %}

**AND**

**Receiving Party:** {{ receiving_party }}
{% if receiving_party_address %}Address: {{ receiving_party_address }}{% endif %}

{% if mutual %}
(This is a **Mutual NDA** — both parties may disclose and receive Confidential Information.)
{% endif %}

## 1. PURPOSE

The parties wish to explore a business relationship concerning: **{{ purpose }}**. In connection with this, {% if mutual %}each party{% else %}the Disclosing Party{% endif %} may share certain confidential and proprietary information with the {% if mutual %}other party{% else %}Receiving Party{% endif %}.

## 2. DEFINITION OF CONFIDENTIAL INFORMATION

"Confidential Information" means any data or information, oral or written, disclosed by {% if mutual %}either party{% else %}the Disclosing Party{% endif %} that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and circumstances of disclosure. This includes, but is not limited to: trade secrets, business plans, financial information, customer lists, technical data, product designs, and marketing strategies.

{% if exclusions %}
### Exclusions
The following shall not be considered Confidential Information: {{ exclusions }}
{% endif %}

## 3. OBLIGATIONS OF THE RECEIVING PARTY

The Receiving Party agrees to:
1. Hold the Confidential Information in strict confidence;
2. Not disclose the Confidential Information to any third party without prior written consent;
3. Use the Confidential Information solely for the Purpose described above;
4. Take reasonable measures to protect the secrecy of the Confidential Information;
5. Restrict access to those employees, consultants, or advisors who have a legitimate need to know and who are bound by confidentiality obligations no less stringent than those contained herein;
6. Promptly notify the Disclosing Party upon becoming aware of any unauthorised access, disclosure, misuse, or loss of Confidential Information.

## 4. PERMITTED DISCLOSURE

The Receiving Party may disclose Confidential Information only where such disclosure is required by law, regulation, or valid court order, provided that, to the extent legally permissible, the Receiving Party gives prompt notice to the Disclosing Party so that appropriate protective measures may be sought.

## 5. TERM

This Agreement shall remain in effect for a period of **{{ duration_years | default("2") }} years** from the date of execution, unless terminated earlier by mutual written consent.

## 6. RETURN OF INFORMATION

Upon termination or upon request, the Receiving Party shall promptly return or destroy all Confidential Information and any copies thereof.

## 7. INTELLECTUAL PROPERTY

All Confidential Information shall remain the sole property of the Disclosing Party. No licence, assignment, transfer, or other right in respect of patents, copyrights, trademarks, trade secrets, or other intellectual property rights is granted or implied by disclosure under this Agreement.

## 8. REMEDIES

The parties acknowledge that breach of this Agreement may cause irreparable harm for which monetary damages alone may not be an adequate remedy, and the Disclosing Party shall be entitled to seek injunctive or equitable relief in addition to any other remedies available at law.

## 9. GOVERNING LAW

This Agreement shall be governed by the laws of **{{ governing_law | default("India") }}**{% if jurisdiction %}, and any disputes shall be subject to the exclusive jurisdiction of the courts at **{{ jurisdiction }}**{% endif %}.

## 10. GENERAL

This Agreement constitutes the entire understanding between the parties in relation to confidentiality and supersedes prior discussions on that subject. Any amendment shall be valid only if made in writing and signed by both parties. If any provision is held invalid, the remaining provisions shall continue in full force and effect.

---

**IN WITNESS WHEREOF**, the parties have executed this Agreement as of the date first written above.

| | |
|---|---|
| **DISCLOSING PARTY** | **RECEIVING PARTY** |
| Name: {{ disclosing_party }} | Name: {{ receiving_party }} |
| Signature: _________________ | Signature: _________________ |
| Date: {{ effective_date }} | Date: {{ effective_date }} |
