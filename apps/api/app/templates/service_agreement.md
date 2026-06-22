# SERVICE AGREEMENT

This Service Agreement ("Agreement") is entered into on **{{ start_date }}**.

## BETWEEN

**Service Provider:** {{ service_provider }}
{% if provider_address %}Address: {{ provider_address }}{% endif %}

**AND**

**Client:** {{ client_name }}
{% if client_address %}Address: {{ client_address }}{% endif %}

## 1. SCOPE OF SERVICES

The Service Provider agrees to perform the following services: **{{ services_description }}**

{% if deliverables %}
### Deliverables
{{ deliverables }}
{% endif %}

## 2. TERM

This Agreement shall commence on **{{ start_date }}** and shall continue until **{{ end_date }}**, unless terminated earlier in accordance with this Agreement.

## 3. COMPENSATION

The Client shall pay the Service Provider a total of **{{ compensation }}** for the services rendered.

{% if payment_terms %}
### Payment Terms
{{ payment_terms }}
{% endif %}

## 4. CLIENT COOPERATION

The Client shall provide in a timely manner all information, approvals, materials, access, and cooperation reasonably required for the proper performance of the services. Any delay caused by the Client may result in adjustment of delivery timelines and related obligations.

## 5. INDEPENDENT CONTRACTOR

The Service Provider is an independent contractor and not an employee of the Client.

## 6. CONFIDENTIALITY

Each party agrees to maintain the confidentiality of any proprietary information received from the other party during the term of this Agreement.

## 7. INTELLECTUAL PROPERTY

Unless otherwise agreed in writing, all pre-existing intellectual property of each party shall remain vested in that party. Upon full payment of the agreed compensation, the Client shall receive the benefit of the final deliverables specifically created under this Agreement, subject to any third-party rights and any pre-existing tools, frameworks, know-how, or reusable materials of the Service Provider.

## 8. WARRANTIES AND LIMITATION

The Service Provider shall perform the services with reasonable skill, care, and diligence consistent with accepted professional standards. Except as expressly stated, no other warranty is made. Neither party shall be liable for indirect, incidental, special, or consequential loss except where such exclusion is not permitted by law.

## 9. TERMINATION

Either party may terminate this Agreement by providing **{{ termination_notice_days | default("30") }} days** written notice to the other party.

## 10. DISPUTE RESOLUTION

The parties shall first attempt to resolve any dispute through good-faith discussions. If unresolved, either party may pursue legal remedies before the appropriate court or forum of competent jurisdiction.

## 11. GOVERNING LAW

This Agreement shall be governed by the laws of **{{ governing_law | default("India") }}**.

---

| | |
|---|---|
| **SERVICE PROVIDER** | **CLIENT** |
| Name: {{ service_provider }} | Name: {{ client_name }} |
| Signature: _________________ | Signature: _________________ |
| Date: {{ start_date }} | Date: {{ start_date }} |
