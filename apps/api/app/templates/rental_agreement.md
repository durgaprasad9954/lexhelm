# RENTAL / LEASE AGREEMENT

This Rental Agreement ("Agreement") is made and executed on this **{{ lease_start_date }}** at **{{ property_address }}**.

## BETWEEN

**LANDLORD:** {{ landlord_name }}
{% if landlord_address %}Address: {{ landlord_address }}{% endif %}
(hereinafter referred to as the "Landlord", which expression shall, unless repugnant to the context, include his/her heirs, executors, administrators, and assigns)

**AND**

**TENANT:** {{ tenant_name }}
{% if tenant_address %}Address: {{ tenant_address }}{% endif %}
(hereinafter referred to as the "Tenant", which expression shall, unless repugnant to the context, include his/her heirs, executors, administrators, and assigns)

## RECITALS

WHEREAS the Landlord is the lawful owner of the premises situated at **{{ property_address }}** and is desirous of letting out the said premises to the Tenant{% if purpose %} for the purpose of **{{ purpose }}**{% endif %};

AND WHEREAS the Tenant has agreed to take the said premises on rent on the terms and conditions set out herein.

## NOW THIS AGREEMENT WITNESSETH AS FOLLOWS:

### 1. TERM OF LEASE

The tenancy shall commence on **{{ lease_start_date }}** and shall remain in force for a period of **{{ lease_duration_months }} months**, unless terminated earlier in accordance with the provisions herein.

### 2. MONTHLY RENT

The Tenant shall pay a monthly rent of **Rs. {{ monthly_rent }}/-** (Rupees {{ monthly_rent }} Only) to the Landlord, payable on or before the 5th day of each calendar month.

{% if escalation_percent %}
The rent shall be escalated by **{{ escalation_percent }}%** per annum from the date of commencement.
{% endif %}

{% if maintenance_charges %}
### 3. MAINTENANCE CHARGES

In addition to rent, the Tenant shall pay maintenance charges of **Rs. {{ maintenance_charges }}/-** per month.
{% endif %}

### {{ "4" if maintenance_charges else "3" }}. SECURITY DEPOSIT

The Tenant has deposited a sum of **Rs. {{ security_deposit }}/-** (Rupees {{ security_deposit }} Only) as refundable security deposit with the Landlord. This deposit shall be refunded to the Tenant at the time of vacating the premises, after deducting any arrears of rent or charges for damages, if any.

### GENERAL TERMS

1. The Tenant shall use the premises only for {% if purpose %}{{ purpose }}{% else %}residential purposes{% endif %} and shall not use the same for any illegal or immoral purpose.
2. The Tenant shall not sublet, assign, or transfer the premises or any part thereof to any third party without the prior written consent of the Landlord.
3. The Tenant shall maintain the premises in good condition and shall be responsible for minor repairs and maintenance.
4. The Landlord shall be responsible for structural repairs and maintenance of the premises.
5. Either party may terminate this Agreement by giving **{{ notice_period_days | default("30") }} days** prior written notice to the other party.
6. The Tenant shall not make any structural alterations to the premises without the prior written consent of the Landlord.
7. The Tenant shall pay all utility bills (electricity, water, gas) during the tenancy period.

{% if furnishing_details %}
### FURNISHING

The premises is let out with the following furnishing: {{ furnishing_details }}
{% endif %}

{% if restrictions %}
### RESTRICTIONS

{{ restrictions }}
{% endif %}

### DISPUTE RESOLUTION

Any dispute arising out of this Agreement shall be resolved amicably through mutual discussion. If the dispute cannot be resolved amicably, it shall be referred to arbitration under the Arbitration and Conciliation Act, 1996.

### GOVERNING LAW

This Agreement shall be governed by and construed in accordance with the laws of India.

---

**IN WITNESS WHEREOF**, the parties hereto have set their hands on this Agreement on the day, month, and year first above written.

| | |
|---|---|
| **LANDLORD** | **TENANT** |
| Name: {{ landlord_name }} | Name: {{ tenant_name }} |
| Signature: _________________ | Signature: _________________ |
| Date: {{ lease_start_date }} | Date: {{ lease_start_date }} |

**WITNESSES:**

1. Name: _________________ Signature: _________________
2. Name: _________________ Signature: _________________
