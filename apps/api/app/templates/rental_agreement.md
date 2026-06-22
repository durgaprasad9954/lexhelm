{% set stamp_value = stamp_amount or "10" %}
<div style="font-family:'Times New Roman', Times, serif;color:#111111;background:#ffffff;padding:0;">
  <div style="margin:0 auto;max-width:860px;background:#ffffff;padding:0 10px 30px;">
    <div style="margin:0 0 26px;">
      <img src="{{ stamp_image_src }}" alt="Non-judicial stamp paper Rs.{{ stamp_value }}" style="width:100%;display:block;border:1px solid #111111;" />
    </div>

    <h1 style="margin:0 0 28px;text-align:center;font-size:26px;font-weight:700;text-decoration:underline;letter-spacing:0.03em;">LEASE DEED</h1>

    <p style="margin:0 0 16px;font-size:18px;line-height:1.8;text-align:justify;">
      THIS DEED OF LEASE made on this <strong>{{ agreement_date }}</strong> at <strong>{{ jurisdiction }}</strong>
      between <strong>{{ landlord_name }}</strong>, residing at <strong>{{ landlord_address }}</strong>, holder of
      Aadhaar No. <strong>{{ landlord_adhar_no }}</strong>, hereinafter referred to as the <strong>Lessor</strong>
      (which expression shall, unless repugnant to the context, include the lessor's heirs, legal representatives,
      executors, administrators and assigns) of the One Part;
    </p>

    <p style="margin:0 0 22px;font-size:18px;line-height:1.8;text-align:justify;">
      AND <strong>{{ tenant_name }}</strong>, residing at <strong>{{ tenant_address }}</strong>, holder of Aadhaar
      No. <strong>{{ tenant_adhar_no }}</strong>, hereinafter referred to as the <strong>Lessee</strong>
      (which expression shall, unless repugnant to the context, include the lessee's successors and permitted assigns)
      of the Other Part.
    </p>

    <p style="margin:0 0 14px;font-size:18px;line-height:1.8;text-align:justify;">
      WHEREAS the Lessor is lawfully entitled to lease the premises situated at <strong>{{ property_address }}</strong>,
      being a <strong>{{ property_type }}</strong> with <strong>{{ number_of_bedrooms }}</strong> bedroom(s) and
      <strong>{{ number_of_bathrooms }}</strong> bathroom(s), hereinafter referred to as the <strong>Said Premises</strong>;
    </p>

    <p style="margin:0 0 14px;font-size:18px;line-height:1.8;text-align:justify;">
      WHEREAS the Lessee approached the Lessor for taking the Said Premises on lease for residential use and
      the Lessor agreed to grant the same upon the terms and conditions recorded herein;
    </p>

    <p style="margin:0 0 24px;font-size:18px;line-height:1.8;text-align:justify;">
      NOW THIS DEED WITNESSETH AS FOLLOWS:
    </p>

    <ol style="margin:0;padding-left:34px;font-size:18px;line-height:1.8;">
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Commencement and term of lease.</strong> The lease shall be deemed to have commenced from
        <strong>{{ lease_start_date }}</strong>
        {% if lease_end_date %}
          and shall continue until <strong>{{ lease_end_date }}</strong>.
        {% else %}
          and shall continue in accordance with the agreed tenancy term until lawfully terminated.
        {% endif %}
        {% if lease_duration_months %}
          The agreed duration of the lease is <strong>{{ lease_duration_months }}</strong> month(s).
        {% endif %}
        During the currency of the term, the Lessee shall be entitled to peaceful occupation of the Said Premises,
        subject to observance of the terms and conditions contained in this Deed.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Nature of tenancy and renewal.</strong> The lease is granted as a <strong>{{ lease_type }}</strong>.
        The Lessee may vacate the Said Premises by giving
        <strong>{{ notice_required_to_terminate }}</strong> day(s) prior notice to the Lessor.
        {% if renewal_option_allowed == "Yes" %}
          The parties may renew the lease by mutual written consent executed before the expiry of the existing term.
        {% else %}
          No renewal, extension, or continuation shall arise automatically unless both parties separately agree in writing.
        {% endif %}
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Monthly rent.</strong> The Lessee shall pay to the Lessor a monthly rent of
        <strong>Rs. {{ monthly_rent }}</strong>, payable on or before the <strong>{{ rent_due_day_label }}</strong>
        day of each English calendar month, without delay or unauthorised deduction except where deduction is
        expressly permitted under this Deed or under applicable law.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Security deposit.</strong> The Lessee has paid or shall pay a refundable security deposit of
        <strong>Rs. {{ security_deposit }}</strong> as security for due observance of the terms of this Deed.
        {{ government_deposit_return_policy }}
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Inventory, fittings, and condition on handover.</strong> The Said Premises together with such locks,
        keys, switches, sanitary fittings, fans, lights, cupboards, and other fixtures as are made available at the
        time of occupation shall be deemed to have been handed over in usable condition, subject to reasonable
        inspection by the Lessee. At the time of vacating, the Lessee shall return the premises and such fixtures in
        substantially the same condition, normal wear and tear excepted, and any missing item or unusual damage may be
        assessed and adjusted in accordance with the security deposit clause.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Taxes and outgoings.</strong> Charges for electricity shall be borne by
        <strong>{{ electricity_paid_by }}</strong> and charges for water shall be borne by
        <strong>{{ water_paid_by }}</strong>. Municipal taxes, property ownership dues, and structural charges
        relating to the Said Premises shall remain the responsibility of the Lessor unless otherwise agreed in writing.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Use and occupation.</strong> The Lessee shall use the Said Premises only for lawful residential
        purposes and shall keep the same in good, clean, and tenantable condition, subject always to normal wear and tear.
        {% if property_type == "Room" %}
          The minimum intended occupancy is <strong>{{ minimum_number_of_occupants or "as mutually agreed" }}</strong>.
          Subletting is <strong>{{ subletting_allowed or "No" }}</strong>.
          {% if subletting_terms %}
            {{ subletting_terms }}
          {% endif %}
          {% if guest_policy_description %}
            Guest policy: {{ guest_policy_description }}
          {% endif %}
        {% endif %}
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Repairs, fixtures, and alterations.</strong> The Lessee shall not make any structural alterations
        without the Lessor's prior written consent. Alterations are
        <strong>{{ alterations_allowed or "not permitted" }}</strong> and painting is
        <strong>{{ painting_allowed or "not permitted" }}</strong>.
        {% if alteration_approval_process %}
          {{ alteration_approval_process }}
        {% endif %}
        {% if nails_and_holes_policy %}
          {{ nails_and_holes_policy }}
        {% endif %}
        Minor removable fixtures and ordinary domestic fittings may be installed only in a manner that does not
        damage the permanent structure of the Said Premises.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Maintenance and essential services.</strong> Day-to-day cleanliness, ordinary housekeeping, and minor
        consumable replacements arising from regular use shall be the responsibility of the Lessee. Major structural
        repairs, latent defects, roof leaks, main plumbing failures, and electrical defects not caused by misuse shall
        be attended to by the Lessor within a reasonable time after written notice. Neither party shall deliberately
        interfere with essential services to the Said Premises, and both parties shall cooperate in resolving urgent
        maintenance issues in a timely manner.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Peaceful enjoyment.</strong> The Lessor assures the Lessee quiet, peaceful, and uninterrupted
        possession and enjoyment of the Said Premises during the subsistence of the lease, provided the Lessee
        duly performs the obligations contained in this Deed.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Compliance with law.</strong> The Lessee shall not carry on any unlawful, immoral, hazardous,
        or nuisance-causing activity in the Said Premises and shall comply with all reasonable society rules,
        local authority regulations, and statutory requirements applicable to the occupancy and use of the property.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Inspection and access.</strong> The Lessor or the Lessor's authorised representative may enter
        the Said Premises at reasonable times, upon reasonable prior notice, for inspection, repair, maintenance,
        or for showing the premises to prospective tenants or purchasers, except in emergency situations where
        immediate access is necessary to prevent damage or ensure safety.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Representations and indemnity.</strong> Each party represents that the information furnished by such
        party for execution of this Deed is true to the best of that party's knowledge. The Lessee shall be
        responsible for loss or liability arising from unlawful use, wilful misconduct, or negligent acts committed by
        the Lessee, family members, guests, invitees, or occupants introduced by the Lessee. The Lessor shall remain
        responsible for claims arising from defects in title, lack of authority to lease, or failure to disclose legal
        restrictions materially affecting occupation of the Said Premises.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Default and termination.</strong> In the event of persistent non-payment of rent, material breach
        of the terms of this Deed, unlawful use, or substantial damage to the Said Premises, the aggrieved party
        shall be entitled to take such lawful action as may be available after giving reasonable notice wherever required.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Handover on expiry.</strong> Upon expiry or earlier lawful termination, the Lessee shall hand over
        vacant and peaceful possession of the Said Premises to the Lessor together with keys and fixtures belonging
        to the property, subject to ordinary wear and tear from normal residential use.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Entire understanding and written modifications.</strong> This Deed records the complete understanding
        between the parties in relation to the Said Premises and supersedes prior oral discussions on the same subject.
        Any amendment, waiver, extension, concession, or side arrangement affecting rent, term, possession, deposit,
        or user conditions shall be valid only if reduced to writing and acknowledged by both parties.
      </li>
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Dispute resolution and jurisdiction.</strong> Any dispute arising out of or relating to this Deed
        shall first be attempted to be resolved amicably between the parties. Failing such resolution, the courts
        having jurisdiction over <strong>{{ jurisdiction }}</strong> alone shall have jurisdiction.
      </li>
      {% if smoking_allowed == "Yes" or drug_policy_description or criminal_activity_policy or legal_use_of_premises_policy or assignment_transfer_policy or move_out_condition_requirements %}
      <li style="margin:0 0 18px;padding-left:8px;text-align:justify;">
        <strong>Additional agreed conditions.</strong>
        {% if smoking_allowed %} Smoking policy: <strong>{{ smoking_allowed }}</strong>.{% endif %}
        {% if drug_policy_description %} {{ drug_policy_description }}{% endif %}
        {% if criminal_activity_policy %} {{ criminal_activity_policy }}{% endif %}
        {% if legal_use_of_premises_policy %} {{ legal_use_of_premises_policy }}{% endif %}
        {% if assignment_transfer_policy %} {{ assignment_transfer_policy }}{% endif %}
        {% if move_out_condition_requirements %} {{ move_out_condition_requirements }}{% endif %}
      </li>
      {% endif %}
    </ol>

    <h2 style="margin:34px 0 14px;text-align:center;font-size:22px;font-weight:700;text-transform:uppercase;">Schedule Of The Property</h2>
    <p style="margin:0 0 8px;font-size:18px;line-height:1.8;text-align:center;">{{ property_address }}</p>
    <p style="margin:0 0 24px;font-size:18px;line-height:1.8;text-align:center;">
      Property Type: {{ property_type }} | Bedrooms: {{ number_of_bedrooms }} | Bathrooms: {{ number_of_bathrooms }}
    </p>

    <p style="margin:0 0 34px;font-size:18px;line-height:1.8;text-align:justify;">
      In witness whereof the parties hereto have set their hands to this Lease Deed on the date and place first
      mentioned above.
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:18px;">
      <tr>
        <td style="width:50%;padding:12px 8px 48px 0;vertical-align:top;">WITNESSES</td>
        <td style="width:50%;padding:12px 0 48px 8px;vertical-align:top;text-align:right;">LANDLORD</td>
      </tr>
      <tr>
        <td style="padding:12px 8px 54px 0;vertical-align:top;">(1) {{ witness_signature or "________________________" }}</td>
        <td style="padding:12px 0 54px 8px;vertical-align:top;text-align:right;">{{ landlord_signature or landlord_name }}</td>
      </tr>
      <tr>
        <td style="padding:12px 8px 0 0;vertical-align:top;">(2) ________________________</td>
        <td style="padding:12px 0 0 8px;vertical-align:top;text-align:right;">TENANT<br />{{ tenant_signature or tenant_name }}</td>
      </tr>
    </table>
  </div>
</div>
