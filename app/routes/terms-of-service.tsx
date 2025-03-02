import { Footer } from "@/components/footer";
import { StyledMarkdown } from "@/components/styled-markdown";
import TopNav from "@/components/top-nav";
import { seo } from "@/lib/seo";
import { createFileRoute } from "@tanstack/react-router";
import Markdown from "react-markdown";

const markdown = `
# Terms of Use for Slipstream Video

**Last Updated: 03/02/2025**

Welcome to Slipstream Video! By accessing or using our website and services, you agree to comply with and be bound by the following terms and conditions. Please read them carefully.

## 1. Acceptance of Terms

By using Slipstream Video, you agree to these Terms of Use and our Privacy Policy. If you do not agree, please do not use our services.

## 2. Changes to Terms

We may update these Terms of Use from time to time. We will notify you of any changes by posting the new Terms on this page. Your continued use of the service after any changes constitutes your acceptance of the new Terms.

## 3. User Accounts

To access certain features of Slipstream Video, you may need to create an account. You agree to provide accurate, current, and complete information during the registration process and to update such information to keep it accurate, current, and complete.

### 3.1 Account Security

You are responsible for maintaining the confidentiality of your account and password and for restricting access to your account. You agree to accept responsibility for all activities that occur under your account.

## 4. User Content

You are solely responsible for any content you upload, post, or otherwise transmit via Slipstream Video. By submitting content, you grant Slipstream Video a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, publish, and distribute such content.

### 4.1 Content Guidelines

You agree not to upload, post, or transmit any content that:

- Violates any applicable law or regulation.
- Infringes on the intellectual property rights of others.
- Is defamatory, obscene, abusive, or otherwise objectionable.

If you upload any content that is illegal or copyrighted, you acknowledge that you are solely responsible for any consequences that arise from such actions. Slipstream Video will not be held liable for any legal action taken against you for uploading such content.

## 5. Paid Tiers

Slipstream Video offers users access to paid tiers that provide varying features and pricing. You acknowledge that:

- The prices and features of these paid tiers are subject to change at any time for any reason.
- Slipstream Video reserves the right to remove a user's access to a paid tier at any time for any reason, including but not limited to violations of these Terms of Use.

## 6. Intellectual Property

All content, trademarks, and other intellectual property on Slipstream Video are the property of Slipstream Video or its licensors. You may not use, reproduce, or distribute any content without our express written permission.

## 7. User Responsibilities

You agree to use Slipstream Video in a manner that is lawful and respectful. You will not engage in any conduct that is harassing, abusive, or otherwise objectionable to other users.

## 8. Third-Party Links

Slipstream Video may contain links to third-party websites or services. We are not responsible for the content or practices of these third-party sites. Your use of such sites is at your own risk.

## 9. Indemnification

You agree to indemnify and hold harmless Slipstream Video, its affiliates, and their respective officers, directors, employees, and agents from any claims, losses, liabilities, damages, costs, or expenses arising from your use of the service or your violation of these Terms.

## 10. Termination

We reserve the right to suspend or terminate your account and access to Slipstream Video at our discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users or the service.

## 11. Disclaimers

Slipstream Video is provided on an "as-is" and "as-available" basis. We make no warranties, express or implied, regarding the operation of the service or the information, content, materials, or products included on the site.

## 12. Limitation of Liability

To the fullest extent permitted by law, Slipstream Video shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service.

## 13. Governing Law

These Terms of Use shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law principles.

## 14. Dispute Resolution

In the event of any disputes arising out of or related to these Terms or your use of Slipstream Video, you agree that Slipstream Video shall have the final authority to resolve such disputes at its discretion. You acknowledge and agree that any decision made by Slipstream Video regarding the resolution of disputes is final and binding.

## 15. Force Majeure

Slipstream Video shall not be liable for any failure to perform its obligations under these Terms if such failure results from any cause beyond Slipstream Video's reasonable control, including, but not limited to, mechanical, electronic, or communications failure or degradation.

## 16. Severability

If any provision of these Terms is found to be unenforceable or invalid, the remaining provisions will continue to be valid and enforceable.

## 17. Entire Agreement

These Terms of Use constitute the entire agreement between you and Slipstream Video regarding your use of the service and supersede any prior agreements.

## 18. Contact Information

If you have any questions about these Terms of Use, please contact us at [support@slipstream.video](mailto:support@slipstream.video).
`;

export const Route = createFileRoute("/terms-of-service")({
  component: RouteComponent,
  head: () => ({
    meta: seo({
      title: "Terms of Service",
      description: "Terms of Service for Slipstream Video",
    }),
  }),
});

function RouteComponent() {
  return (
    <div className="flex flex-col min-h-screen">
      <TopNav />
      <div className="flex items-center justify-center w-full mt-12">
        <div className="w-[64rem]">
          <StyledMarkdown>{markdown}</StyledMarkdown>
        </div>
      </div>
      <Footer />
    </div>
  );
}
