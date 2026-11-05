import nodemailer from 'nodemailer';
import { type IUserDocument } from '../types/user.ts';

const mailerConfig = {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
    },
};

const transporter = nodemailer.createTransport(mailerConfig);

export async function sendVerificationEmail(
    user: IUserDocument,
    otpCode: string
): Promise<void> {
    const mailOptions = {
        from: `VolunteerHub <${mailerConfig.auth.user}>`,
        to: user.email,
        subject: 'VolunteerHub: Email Verification Code',
        html: `
            <p>Hello ${user.username},</p>
            <p>Thank you for registering. Please use the following code to verify your account:</p>
            <h2 style="color: #007bff;">${otpCode}</h2>
            <p>This code is valid for 10 minutes.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to: ${user.email}`);
    } catch (error) {
        console.error('ERROR sending email:', error);
    }
}

export async function sendResetPasswordEmail(
    user: IUserDocument,
    otpCode: string
): Promise<void> {
    const mailOptions = {
        from: `VolunteerHub <${mailerConfig.auth.user}>`,
        to: user.email,
        subject: 'VolunteerHub: Password Reset Code',
        html: `
            <p>Hello ${user.username},</p>
            <p>We received a request to reset the password for your account. Use the following verification code to reset your password:</p>
            <h2 style="color: #007bff;">${otpCode}</h2>
            <p>This code is valid for 10 minutes. If you did not request a password reset, please ignore this email.</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to: ${user.email}`);
    } catch (error) {
        console.error('ERROR sending reset email:', error);
    }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export interface EventReminderEmail {
    to: string;
    /** Name to greet: the volunteer's display name or username. */
    greeting: string;
    eventTitle: string;
    /** Start time already written for people, time zone included. */
    when: string;
    location: string;
    url: string;
    /** The event as an .ics, attached so it can be added to a calendar in one click. */
    ics: string;
    icsFilename: string;
}

/**
 * The 24-hour reminder (services/reminder.service.ts), through the same
 * transporter as the verification codes. Unlike those it throws on failure,
 * so the reminder run can count and log it.
 */
export async function sendEventReminderEmail(mail: EventReminderEmail): Promise<void> {
    const title = escapeHtml(mail.eventTitle);
    await transporter.sendMail({
        from: `VolunteerHub <${mailerConfig.auth.user}>`,
        to: mail.to,
        subject: `VolunteerHub: Reminder, ${mail.eventTitle} starts soon`,
        text: [
            `Hello ${mail.greeting},`,
            '',
            `This is a reminder that ${mail.eventTitle} starts ${mail.when}.`,
            ...(mail.location ? [`Location: ${mail.location}`] : []),
            '',
            `Event page: ${mail.url}`,
            'The attached .ics file adds the event to your calendar.',
        ].join('\n'),
        html: `
            <p>Hello ${escapeHtml(mail.greeting)},</p>
            <p>This is a reminder that <strong>${title}</strong> starts ${escapeHtml(mail.when)}.</p>
            ${mail.location ? `<p>Location: ${escapeHtml(mail.location)}</p>` : ''}
            <p><a href="${escapeHtml(mail.url)}">Open the event page</a></p>
            <p>The attached .ics file adds the event to your calendar.</p>
        `,
        attachments: [{ filename: mail.icsFilename, content: mail.ics, contentType: 'text/calendar; charset=utf-8' }],
    });
}
