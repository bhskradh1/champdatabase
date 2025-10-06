import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FilterSectionProps {
  feeStatusFilter: string;
  setFeeStatusFilter: (value: string) => void;
  attendanceFilter: string;
  setAttendanceFilter: (value: string) => void;
  classFilter: string;
  setClassFilter: (value: string) => void;
  classes: string[];
}

const FilterSection = ({
  feeStatusFilter,
  setFeeStatusFilter,
  attendanceFilter,
  setAttendanceFilter,
  classFilter,
  setClassFilter,
  classes,
}: FilterSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div>
        <label className="text-sm font-medium mb-2 block">Fee Status</label>
        <Select value={feeStatusFilter} onValueChange={setFeeStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Attendance</label>
        <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="above80">Above 80%</SelectItem>
            <SelectItem value="60to80">60% - 80%</SelectItem>
            <SelectItem value="below60">Below 60%</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Class</label>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger>
            <SelectValue placeholder="All Classes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FilterSection;
