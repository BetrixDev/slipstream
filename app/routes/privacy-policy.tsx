import { Footer } from "@/components/footer";
import { StyledMarkdown } from "@/components/styled-markdown";
import TopNav from "@/components/top-nav";
import { createFileRoute } from "@tanstack/react-router";

const markdown = `
# Privacy Policy for Slipstream Video

**Last Updated: 03/02/2025**

At Slipstream Video, we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services. Please read this policy carefully. If you do not agree with the terms of this Privacy Policy, please do not access the site.

## 1. Information We Collect

We may collect information about you in a variety of ways, including:

### 1.1 Personal Information

When you create an account, subscribe to our services, or contact us, we may collect personal information that can identify you, such as:

- Name
- Email address
- Payment information (if applicable)
- Any other information you provide to us

### 1.2 Usage Data

We may also collect information about how you access and use our services, including:

- Your IP address
- Browser type
- Operating system
- Pages visited
- Time and date of visits
- Time spent on those pages
- Other diagnostic data

### 1.3 Cookies and Tracking Technologies

We may use cookies, web beacons, and similar tracking technologies to monitor activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.

## 2. User-Uploaded Content

When you upload videos or files to Slipstream Video, you acknowledge that any information contained within those files may be accessed by Slipstream Video. This includes metadata, descriptions, and any other information you provide in the uploaded content. 

### 2.1 Unlisted and Private Videos

Slipstream Video offers options for users to upload videos as "Unlisted" or "Private." 

- **Unlisted Videos**: These videos will not appear in search results or on your profile. However, anyone with the link can view the video. Please be cautious about sharing the link, as it can be accessed by anyone who has it.

- **Private Videos**: These videos are only accessible to you. Private videos will not be visible to the public in any way.

By using these features, you understand that while we take measures to protect your privacy, we cannot guarantee the security of the content you upload.

## 3. How We Use Your Information

We use the information we collect in various ways, including to:

- Provide, operate, and maintain our website and services
- Communicate with you, either directly or through one of our partners, including for customer service, to provide you with updates and other information relating to the website, and for marketing and promotional purposes
- Process your transactions and send you related information, including purchase confirmations and invoices
- Find and prevent fraud

## 4. Disclosure of Your Information

We may share information we have collected about you in certain situations. Your information may be disclosed as follows:

### 4.1 By Law or to Protect Rights

If we believe the release of information about you is necessary to respond to legal process, to investigate or remedy potential violations of our policies, or to protect the rights, property, and safety of others, we may share your information as permitted or required by any applicable law, rule, or regulation.

### 4.2 Third-Party Service Providers

We may share your information with third parties that perform services for us or on our behalf, including payment processing, data analysis, email delivery, hosting services, customer service, and marketing assistance.

### 4.3 Business Transfers

We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.

## 5. Security of Your Information

We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee its absolute security.

## 6. Your Rights

Depending on your location, you may have the following rights regarding your personal information:

- The right to access - You have the right to request copies of your personal information.
- The right to rectification - You have the right to request that we correct any information you believe is inaccurate or incomplete.
- The right to erasure - You have the right to request that we erase your personal information, under certain conditions.
- The right to restrict processing - You have the right to request that we restrict the processing of your personal information, under certain conditions.
- The right to data portability - You have the right to request that we transfer the data that we have collected to another organization, or directly to you, under certain conditions.

If you make a request, we have one month to respond to you. If you would like to exercise any of these rights, please contact us at support@slipstream.video.

## 7. Third-Party Websites

Our website may contain links to third-party websites and applications of interest, including advertisements and external services that are not affiliated with us. Once you have used these links to leave our site, any information you provide to these third parties is not covered by this Privacy Policy, and we cannot guarantee the safety and privacy of your information.

## 8. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes. Changes to this Privacy Policy are effective when they are posted on this page.

## 9. Contact Us

If you have any questions about this Privacy Policy, please contact us at support@slipstream.video.
`;

export const Route = createFileRoute("/privacy-policy")({
  component: RouteComponent,
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
