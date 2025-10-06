import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, X, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  userId: string;
}

interface StudentData {
  student_id: string;
  name: string;
  roll_number: string;
  class: string;
  section?: string;
  contact?: string;
  address?: string;
  total_fee?: number;
  remarks?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

const ExcelUploadDialog = ({ open, onOpenChange, onSuccess, userId }: ExcelUploadDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<StudentData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [uploadResults, setUploadResults] = useState<{
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateStudentData = (data: any[], rowOffset: number = 2): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    data.forEach((row, index) => {
      const rowNumber = index + rowOffset;
      
      // Required fields validation
      if (!row.student_id || row.student_id.toString().trim() === '') {
        errors.push({ row: rowNumber, field: 'student_id', message: 'Student ID is required' });
      }
      
      if (!row.name || row.name.toString().trim() === '') {
        errors.push({ row: rowNumber, field: 'name', message: 'Name is required' });
      }
      
      if (!row.roll_number || row.roll_number.toString().trim() === '') {
        errors.push({ row: rowNumber, field: 'roll_number', message: 'Roll number is required' });
      }
      
      if (!row.class || row.class.toString().trim() === '') {
        errors.push({ row: rowNumber, field: 'class', message: 'Class is required' });
      }
      
      // Data type validations
      if (row.total_fee && isNaN(parseFloat(row.total_fee))) {
        errors.push({ row: rowNumber, field: 'total_fee', message: 'Total fee must be a valid number' });
      }
      
      // Contact validation (if provided)
      if (row.contact && row.contact.toString().trim() !== '') {
        const contactStr = row.contact.toString().trim();
        if (!/^[\d\s\-\+\(\)]+$/.test(contactStr)) {
          errors.push({ row: rowNumber, field: 'contact', message: 'Contact must contain only numbers, spaces, and common phone symbols' });
        }
      }
    });
    
    return errors;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.match(/\.(xlsx|xls)$/)) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an Excel file (.xlsx or .xls)",
      });
      return;
    }

    setFile(selectedFile);
    setUploadResults(null);
    setValidationErrors([]);
    setParsedData([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          toast({
            variant: "destructive",
            title: "Invalid file",
            description: "Excel file must contain at least a header row and one data row",
          });
          return;
        }

        // Get headers from first row
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1) as any[][];

        // Map data to student objects
        const students: StudentData[] = dataRows.map((row) => {
          const student: any = {};
          headers.forEach((header, index) => {
            const value = row[index];
            const normalizedHeader = header.toLowerCase().replace(/\s+/g, '_');
            
            switch (normalizedHeader) {
              case 'student_id':
              case 'studentid':
              case 'id':
                student.student_id = value?.toString() || '';
                break;
              case 'name':
              case 'full_name':
              case 'student_name':
                student.name = value?.toString() || '';
                break;
              case 'roll_number':
              case 'rollnumber':
              case 'roll':
                student.roll_number = value?.toString() || '';
                break;
              case 'class':
              case 'grade':
                student.class = value?.toString() || '';
                break;
              case 'section':
                student.section = value?.toString() || '';
                break;
              case 'contact':
              case 'phone':
              case 'mobile':
                student.contact = value?.toString() || '';
                break;
              case 'address':
                student.address = value?.toString() || '';
                break;
              case 'total_fee':
              case 'totalfee':
              case 'fee':
                student.total_fee = value ? parseFloat(value) : 0;
                break;
              case 'remarks':
              case 'notes':
                student.remarks = value?.toString() || '';
                break;
            }
          });
          return student;
        });

        // Validate the data
        const errors = validateStudentData(students);
        setValidationErrors(errors);
        setParsedData(students);

        if (errors.length > 0) {
          toast({
            variant: "destructive",
            title: "Validation errors found",
            description: `Found ${errors.length} validation errors. Please fix them before uploading.`,
          });
        } else {
          toast({
            title: "File parsed successfully",
            description: `Found ${students.length} valid student records`,
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error parsing file",
          description: "Failed to parse Excel file. Please check the file format.",
        });
      }
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleBulkUpload = async () => {
    if (validationErrors.length > 0) {
      toast({
        variant: "destructive",
        title: "Cannot upload",
        description: "Please fix validation errors before uploading",
      });
      return;
    }

    if (parsedData.length === 0) {
      toast({
        variant: "destructive",
        title: "No data to upload",
        description: "Please select and parse an Excel file first",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);
    const results = { successful: 0, failed: 0, errors: [] as string[] };

    try {
      // Process students in batches to avoid overwhelming the database
      const batchSize = 10;
      const totalBatches = Math.ceil(parsedData.length / batchSize);

      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        try {
          const studentsToInsert = batch.map(student => ({
            ...student,
            created_by: userId,
            fee_paid: 0,
            attendance_percentage: 0,
          }));

          const { error } = await supabase
            .from('students')
            .insert(studentsToInsert);

          if (error) {
            results.failed += batch.length;
            results.errors.push(`Batch ${batchNumber}: ${error.message}`);
          } else {
            results.successful += batch.length;
          }
        } catch (error: any) {
          results.failed += batch.length;
          results.errors.push(`Batch ${batchNumber}: ${error.message}`);
        }

        setUploadProgress((batchNumber / totalBatches) * 100);
      }

      setUploadResults(results);

      if (results.successful > 0) {
        toast({
          title: "Upload completed",
          description: `Successfully uploaded ${results.successful} students`,
        });
        onSuccess();
      }

      if (results.failed > 0) {
        toast({
          variant: "destructive",
          title: "Some uploads failed",
          description: `${results.failed} students failed to upload. Check the error details.`,
        });
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setUploadResults(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetDialog();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Students from Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download Section */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Need a template?</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Download our sample template to see the expected format for student data.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const link = document.createElement('a');
                link.href = '/student-template.csv';
                link.download = 'student-template.csv';
                link.click();
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>

          {/* File Upload Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="excel-file">Select Excel File</Label>
              <Input
                id="excel-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Supported formats: .xlsx, .xls
              </p>
            </div>

            {file && (
              <Alert>
                <FileSpreadsheet className="h-4 w-4" />
                <AlertDescription>
                  Selected file: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Validation Errors ({validationErrors.length})
              </h4>
              <div className="max-h-40 overflow-y-auto border rounded-md p-3 bg-destructive/5">
                {validationErrors.map((error, index) => (
                  <div key={index} className="text-sm text-destructive">
                    Row {error.row}, {error.field}: {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Parsed Data Preview */}
          {parsedData.length > 0 && validationErrors.length === 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-green-600 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Ready to Upload ({parsedData.length} students)
              </h4>
              <div className="max-h-40 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Student ID</th>
                      <th className="p-2 text-left">Name</th>
                      <th className="p-2 text-left">Class</th>
                      <th className="p-2 text-left">Roll No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.slice(0, 10).map((student, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-2">{student.student_id}</td>
                        <td className="p-2">{student.name}</td>
                        <td className="p-2">{student.class}</td>
                        <td className="p-2">{student.roll_number}</td>
                      </tr>
                    ))}
                    {parsedData.length > 10 && (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-muted-foreground">
                          ... and {parsedData.length - 10} more students
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading students...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Upload Results */}
          {uploadResults && (
            <Alert className={uploadResults.failed > 0 ? "border-destructive" : "border-green-500"}>
              {uploadResults.failed > 0 ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                <div className="space-y-1">
                  <div>✅ Successfully uploaded: {uploadResults.successful} students</div>
                  {uploadResults.failed > 0 && (
                    <div>❌ Failed to upload: {uploadResults.failed} students</div>
                  )}
                  {uploadResults.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">Errors:</div>
                      <div className="max-h-20 overflow-y-auto text-xs">
                        {uploadResults.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={handleClose}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              onClick={handleBulkUpload}
              disabled={loading || validationErrors.length > 0 || parsedData.length === 0}
            >
              <Upload className="mr-2 h-4 w-4" />
              {loading ? "Uploading..." : `Upload ${parsedData.length} Students`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExcelUploadDialog;
