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

## 4. INDEPENDENT CONTRACTOR

The Service Provider is an independent contractor and not an employee of the Client.

## 5. CONFIDENTIALITY

Each party agrees to maintain the confidentiality of any proprietary information received from the other party during the term of this Agreement.

## 6. TERMINATION

Either party may terminate this Agreement by providing **{{ termination_notice_days | default("30") }} days** written notice to the other party.

## 7. GOVERNING LAW

This Agreement shall be governed by the laws of **{{ governing_law | default("India") }}**.

---

| | |
|---|---|
| **SERVICE PROVIDER** | **CLIENT** |
| Name: {{ service_provider }} | Name: {{ client_name }} |
| Signature: _________________ | Signature: _________________ |
| Date: {{ start_date }} | Date: {{ start_date }} |
