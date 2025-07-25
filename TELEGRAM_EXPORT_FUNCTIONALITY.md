# Telegram Export Functionality

This document describes the new export functionality that allows users to request transaction exports via Telegram and receive files in PDF, CSV, and Excel formats.

## Overview

Users can now request expense reports through the Telegram bot and receive formatted files directly in their chat. The system supports three export formats:

- **PDF**: Professional-looking reports with tables and formatting
- **CSV**: Comma-separated values for spreadsheet import
- **Excel**: Native Excel (.xlsx) files with proper formatting

## How to Use

### Basic Export Commands

Users can request exports using natural language commands:

```
"Export my expenses as PDF"
"Send me a CSV of my expenses"
"Excel export of my transactions"
```

### Date Range Filtering

Users can specify date ranges for their exports:

```
"Export this month's expenses as PDF"
"Send me a CSV of last month's expenses"
"Excel export of this year's transactions"
"Export from 2024-01-01 to 2024-12-31"
```

### Supported Formats

- **PDF**: `"export as pdf"`, `"send me a pdf report"`, `"pdf export"`
- **CSV**: `"export as csv"`, `"send me a csv file"`, `"csv export"`
- **Excel**: `"export as excel"`, `"send me an excel file"`, `"xlsx export"`

## Technical Implementation

### API Endpoint

The export functionality is implemented through a new API endpoint:

```
POST /api/telegram/export
```

**Request Body:**
```json
{
  "telegramId": 123456789,
  "userId": "user-uuid",
  "format": "pdf|csv|excel",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-12-31",
  "businessPurposeIds": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "✅ Your expense report has been sent! 📊\n\n📅 Period: 2024-01-01 to 2024-12-31\n💰 Total: $1,234.56\n📋 Transactions: 25\n📁 Format: PDF"
}
```

### File Generation

#### PDF Format
- Uses jsPDF with autoTable plugin
- Includes title, metadata, and formatted table
- Professional styling with headers and data rows

#### CSV Format
- Standard CSV format with headers
- Properly escaped values for special characters
- Compatible with all spreadsheet applications

#### Excel Format
- Native .xlsx format using the xlsx library
- Proper worksheet formatting
- Includes metadata and data tables

### File Delivery

Files are sent directly to the user's Telegram chat using the bot's `sendDocument` method. Each file includes:

- Descriptive filename with date range
- Caption with summary information
- Proper MIME type for file handling

## Database Integration

The export functionality integrates with the existing expenses table:

```sql
-- Expenses table structure
CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  date DATE NOT NULL,
  merchant_name TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  business_purpose TEXT,
  business_purpose_id UUID REFERENCES business_purposes(id),
  receipt_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Business Purpose Integration

Exports can be filtered by business purpose categories:

```sql
-- Business purposes table
CREATE TABLE business_purposes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id)
);
```

## Security Features

### User Verification
- Verifies Telegram user is linked to Supabase user
- Uses service role client for secure database access
- Validates all input parameters

### Data Privacy
- Only exports user's own expenses
- Respects Row Level Security (RLS) policies
- No sensitive data exposure in filenames or content

### Rate Limiting
- Built-in protection against abuse
- File size limits for generated reports
- Error handling for failed exports

## Error Handling

The system handles various error scenarios:

- **No expenses found**: Returns appropriate message
- **Invalid format**: Validates supported formats
- **Database errors**: Graceful error messages
- **Telegram API errors**: Fallback error handling

## Dependencies

The export functionality requires these additional packages:

```json
{
  "jspdf": "^3.0.1",
  "jspdf-autotable": "^5.0.2",
  "xlsx": "^0.18.5"
}
```

## Testing

### Manual Testing

1. Start the development server: `pnpm dev`
2. Start the Telegram bot: `pnpm bot`
3. Send export commands to the bot:
   - "Export my expenses as PDF"
   - "Send me a CSV of this month's expenses"
   - "Excel export of last month"

### Automated Testing

Use the test script to verify functionality:

```bash
node test-export-functionality.js
```

## File Structure

```
app/api/telegram/export/route.ts    # Export API endpoint
lib/telegram-bot.ts                 # Enhanced with sendDocument method
app/api/telegram/message/route.ts   # Enhanced with export action handling
test-export-functionality.js        # Test script
```

## Future Enhancements

Potential improvements for the export functionality:

1. **Custom Templates**: Allow users to customize report layouts
2. **Scheduled Exports**: Automatic monthly/quarterly reports
3. **Advanced Filtering**: Filter by amount ranges, categories, etc.
4. **Chart Integration**: Include spending charts in PDF reports
5. **Multi-language Support**: Support for different languages
6. **Email Delivery**: Alternative delivery method for large files

## Troubleshooting

### Common Issues

1. **File not received**: Check bot permissions and user blocking status
2. **Empty reports**: Verify user has expenses in the specified date range
3. **Format errors**: Ensure supported format is specified
4. **Large file errors**: Consider implementing file size limits

### Debug Information

Enable debug logging by checking console output for:
- Export API debug messages
- Telegram bot debug messages
- File generation status
- Error details

## Support

For issues with the export functionality:

1. Check the application logs for error messages
2. Verify Telegram bot is running and connected
3. Ensure user is properly linked to their account
4. Test with different date ranges and formats 