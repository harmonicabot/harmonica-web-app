'use server';

import nodemailer from 'nodemailer';
import { Invitation, Workspace } from './schema';
import { getFromHostSession, getWorkspaceById } from './db';

// Configure email transport - this should use environment variables in production
let transporter: nodemailer.Transporter;

function getTransporter() {
  if (!transporter) {
    // Check if we're using SendGrid or other SMTP provider
    if (process.env.SENDGRID_API_KEY) {
      transporter = nodemailer.createTransport({
        service: 'SendGrid',
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      });
    } else {
      // Default to a standard SMTP configuration
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.example.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER || '',
          pass: process.env.SMTP_PASSWORD || '',
        },
      });
    }
  }
  return transporter;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<boolean> {
  try {
    const transport = getTransporter();
    const fromEmail = process.env.EMAIL_FROM || 'noreply@harmonica.ai';
    const fromName = process.env.EMAIL_FROM_NAME || 'Harmonica';
    
    await transport.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });
    
    console.log(`Email sent to ${to}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export async function sendInvitation(invitation: Invitation): Promise<boolean> {
  try {
    const id = invitation.resource_id
    let title, url, type;
    const appUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://app.harmonica.chat';
    switch (invitation.resource_type) {
      case "WORKSPACE":
        title = await getWorkspaceTitle(id);
        url = `${appUrl}/workspace/${id}`;
        type = 'project';
        break;
      case "SESSION":
        title = await getSessionTitle(id);
        url = `${appUrl}/sessions/${id}`;
        type = 'session';
        break;
      default:
        throw new Error(`Unsupported resource type: ${invitation.resource_type}`);            
    }
    
    // These would be better as HTML templates stored separately
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px 8px 0 0;">
          <img src="${appUrl}/harmonica.png" alt="Harmonica Logo" style="height: 40px;" />
        </div>
        <div style="padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
          <h2>You've been invited to join a ${type}</h2>
          <p>Hello,</p>
          <p>You've been invited to join the <strong>${title}</strong> ${type} on Harmonica with <strong>${invitation.role}</strong> access.</p>
          ${invitation.message ? `<p>Message from the inviter: "${invitation.message}"</p>` : ''}
          <p>To access this ${type}, simply log in to Harmonica using this email address.</p>
          <p style="margin: 25px 0;">
            <a href="${url}" style="background-color: #0070f3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
              View ${type}
            </a>
          </p>
          <p style="color: #666; font-size: 0.9em;">If you don't have a Harmonica account yet, you'll need to sign up first using this same email address, and you'll automatically get access to the ${type}.</p>
        </div>
        <div style="text-align: center; color: #666; font-size: 0.8em; margin-top: 20px;">
          <p>© ${new Date().getFullYear()} Harmonica AI. All rights reserved.</p>
        </div>
      </div>
    `;
    
    return await sendEmail({
      to: invitation.email,
      subject: `You've been invited to join the ${title} ${type} on Harmonica`,
      html
    });
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return false;
  }
}

export async function getWorkspaceTitle(id: string) {
  const workspace = await getWorkspaceById(id);
  if (!workspace) {
    throw new Error('Cannot send invitation - project not found');
  }
  return workspace.title  
}

export async function getSessionTitle(id: string) {
  const session = await getFromHostSession(id, ["topic"])
  if (!session) {
    throw new Error('Cannot send invitation - session not found');
  }
  return session.topic  
}