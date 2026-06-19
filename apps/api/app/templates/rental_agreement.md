<div style="font-family:Inter, Arial, sans-serif;color:#000000;background:#F3F5FA;padding:20px;">
  {% set stamp_value = stamp_amount or "10" %}
  <div style="margin:0 auto;max-width:900px;border:2px solid #c7cee3;border-radius:20px;background:#FFFFFF;padding:32px 36px;">
    <div style="text-align:center;margin-bottom:22px;">
      <div style="display:inline-block;width:100%;max-width:760px;border:1px solid #d7deee;border-radius:18px;padding:14px;background:#FFFFFF;">
        {% if stamp_image_data_uri %}
          <img src="{{ stamp_image_data_uri }}" alt="Non-judicial stamp paper Rs.{{ stamp_value }}" style="width:100%;display:block;border-radius:12px;" />
        {% else %}
          <div style="padding:30px 16px;border:1px solid #c7cee3;border-radius:12px;background:#F3F5FA;text-align:center;font-size:18px;font-weight:700;">
            Non-judicial stamp paper Rs.{{ stamp_value }}
          </div>
        {% endif %}
      </div>
    </div>

    <p style="margin:0 0 10px;font-size:18px;line-height:1.8;"><strong>Agreement Date:</strong> {{ agreement_date }}</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.8;"><strong>Jurisdiction:</strong> {{ jurisdiction }}</p>

    <h1 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 1: Introduction</h1>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;">
      This Rental Agreement is made on {{ agreement_date }} between the parties identified below and records the terms on which the landlord agrees to let and the tenant agrees to occupy the premises described in this document.
    </p>

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 2: Parties</h2>
    <p style="margin:0 0 10px;font-size:18px;line-height:1.9;"><strong>Landlord Details:</strong></p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Name:</strong> {{ landlord_name }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Address:</strong> {{ landlord_address }}</p>
    <p style="margin:0 0 18px;font-size:18px;line-height:1.9;"><strong>Aadhaar Number:</strong> {{ landlord_adhar_no }}</p>

    <p style="margin:0 0 10px;font-size:18px;line-height:1.9;"><strong>Tenant Details:</strong></p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Name:</strong> {{ tenant_name }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Address:</strong> {{ tenant_address }}</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Aadhaar Number:</strong> {{ tenant_adhar_no }}</p>

    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;">
      The landlord and the tenant are collectively referred to as the <strong>Parties</strong> in this Agreement.
    </p>

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 3: Property Information</h2>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Property Address:</strong></p>
    <p style="margin:0 0 16px;font-size:18px;line-height:1.9;">{{ property_address }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Property Type:</strong> {{ property_type }}</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;">
      <strong>Property Features:</strong> Bedrooms: {{ number_of_bedrooms }}. Bathrooms: {{ number_of_bathrooms }}.
    </p>

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 4: Lease Term</h2>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Lease Type:</strong> {{ lease_type }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Start Date:</strong> {{ lease_start_date }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>End Date:</strong> {{ lease_end_date or "As stated by the parties or until lawfully terminated" }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Duration:</strong> {{ lease_duration_months or "As per the agreed term" }} month(s)</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Renewal Allowed:</strong> {{ renewal_option_allowed }}</p>

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 5: Rent &amp; Payment</h2>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Monthly Rent:</strong> Rs. {{ monthly_rent }}</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Due Date:</strong> {{ rent_due_date }} of each month.</p>

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 6: Security Deposit</h2>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Security Deposit:</strong> Rs. {{ security_deposit }}</p>

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 7: Utility Responsibilities</h2>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Electricity:</strong> Paid by {{ electricity_paid_by }}</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Water:</strong> Paid by {{ water_paid_by }}</p>

    {% if property_type == "Room" %}
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 8: Occupancy Restrictions</h2>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Minimum Occupants:</strong> {{ minimum_number_of_occupants or "Not separately specified by the parties." }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Subletting Allowed:</strong> {{ subletting_allowed or "No" }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Subletting Terms:</strong> {{ subletting_terms or "Subletting is not permitted except with prior written consent of the landlord." }}</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Guest Policy:</strong> {{ guest_policy_description or "Guests may visit only in a manner that does not create nuisance, overcrowding, or unlawful use of the premises." }}</p>

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 9: Property Alterations</h2>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Alterations Allowed:</strong> {{ alterations_allowed or "No" }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Approval Process:</strong> {{ alteration_approval_process or "Any alteration requires prior written approval from the landlord." }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Painting Allowed:</strong> {{ painting_allowed or "No" }}</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Policy:</strong> {{ nails_and_holes_policy or "No structural or material damage may be caused while fixing nails, shelves, hooks, paint, or fittings." }}</p>
    {% endif %}

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 11: Lease Termination &amp; Renewal</h2>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Termination Notice:</strong> {{ notice_required_to_terminate }} day(s)</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Early Termination Fee:</strong> {{ early_termination_fee and ("Rs. " ~ early_termination_fee) or "Not separately specified." }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Early Termination Penalty:</strong> {{ early_termination_penalty_description or "Any early termination consequences shall follow this Agreement and applicable law." }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Renewal Notice Period:</strong> {{ notice_required_for_renewal or "Not separately specified." }}</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Auto-Renewal:</strong> {{ auto_renewal_terms or "No automatic renewal will apply unless the parties record it in writing." }}</p>

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 12: Security Deposit Return</h2>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;">{{ government_deposit_return_policy }}</p>

    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Smoking Policy:</strong> {{ smoking_allowed or "No" }}</p>
    {% if smoking_allowed == "Yes" %}
    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 14: Additional Clauses &amp; Policies</h2>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Drug Policy:</strong> {{ drug_policy_description or "Use, storage, or distribution of prohibited substances is not permitted on the premises." }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Criminal Activity Policy:</strong> {{ criminal_activity_policy or "No criminal, illegal, or nuisance-causing activity shall be conducted on the premises." }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Legal Use of Premises:</strong> {{ legal_use_of_premises_policy or "The premises shall be used only for lawful purposes consistent with the permitted tenancy use." }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Assignment/Transfer Policy:</strong> {{ assignment_transfer_policy or "The tenant may not assign, transfer, or part with possession without prior written consent of the landlord." }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Move-Out Requirements:</strong> {{ move_out_condition_requirements or "The tenant shall hand over vacant possession, return keys, settle dues, and leave the premises in reasonably clean condition subject to normal wear and tear." }}</p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Cleaning Deposit Required:</strong> {{ cleaning_deposit_required or "No" }}</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;"><strong>Cleaning Deposit Amount:</strong> {{ cleaning_deposit_amount and ("Rs. " ~ cleaning_deposit_amount) or "Not separately specified." }}</p>
    {% endif %}

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Section 15: Signatures</h2>
    <p style="margin:0 0 14px;font-size:18px;line-height:1.9;"><strong>Landlord Signature Section:</strong></p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;">Landlord Signature: _________________________ Date: __________</p>
    <p style="margin:0 0 18px;font-size:18px;line-height:1.9;">Landlord Printed Name: {{ landlord_name }}</p>

    <p style="margin:0 0 14px;font-size:18px;line-height:1.9;"><strong>Tenant Signature Section:</strong></p>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;">Tenant Signature: _________________________ Date: __________</p>
    <p style="margin:0 0 26px;font-size:18px;line-height:1.9;">Tenant Printed Name: {{ tenant_name }}</p>

    <h2 style="margin:0 0 16px;font-size:20px;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;">Document Metadata</h2>
    <p style="margin:0 0 6px;font-size:18px;line-height:1.9;"><strong>Language:</strong> {{ agreement_language }}</p>
    <p style="margin:0;font-size:18px;line-height:1.9;"><strong>Version:</strong> {{ document_version_number or "1.0" }}</p>
  </div>
</div>
