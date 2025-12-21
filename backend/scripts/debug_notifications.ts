import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../models/User.model.ts';
import { ReportService } from '../services/report.service.ts';

const run = async () => {
    try {
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected.');

        const admins = await User.find({ role: 'admin' });
        console.log(`Found ${admins.length} admins.`);
        admins.forEach(a => console.log(` - ${a.username} (${a._id})`));

        const target = await User.findOne({ role: 'volunteer' });
        if (!target) {
            console.log('No volunteer user found to report.');
            return;
        }
        console.log(`Reporting user: ${target.username} (${target._id})`);

        const reporter = admins[0] || target;

        console.log('Calling ReportService.reportUser...');
        const report = await ReportService.reportUser(
            reporter._id.toString(),
            target._id.toString(),
            'Debug Test',
            'Debugging notification delivery'
        );
        console.log('Report created:', report._id);
        console.log('Check server logs for [ReportService] output.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

run();
