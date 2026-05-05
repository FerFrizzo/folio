import sgMail from "@sendgrid/mail";

type Attachment = { filename: string; type: string; content: string };

type SendEmailOptions = {
  apiKey: string;
  templateId: string;
  from: string;
  to: string;
  cc?: string[];
  subject: string;
  dynamicTemplateData: Record<string, unknown>;
  attachments?: Attachment[];
};

export async function sendDynamicEmail(opts: SendEmailOptions): Promise<{ messageId?: string }> {
  sgMail.setApiKey(opts.apiKey);
  const [response] = await sgMail.send({
    from: opts.from,
    to: opts.to,
    ...(opts.cc?.length ? { cc: opts.cc } : {}),
    subject: opts.subject,
    templateId: opts.templateId,
    dynamicTemplateData: opts.dynamicTemplateData,
    attachments: opts.attachments?.map((a) => ({
      filename: a.filename,
      type: a.type,
      content: a.content,
      disposition: "attachment" as const,
    })),
  });
  return { messageId: response.headers["x-message-id"] as string | undefined };
}
