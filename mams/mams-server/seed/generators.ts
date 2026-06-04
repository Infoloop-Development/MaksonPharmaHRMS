/**
 * Mock data generators ported from the approved mockup.
 * Same Park-Miller PRNG, same weighting tables, so seeded output matches mockup behaviour.
 */
import { MAKSON_DEPARTMENTS } from '@mams/types';
import { seededRandom } from '../src/utils/prng.js';

export const FN = ['Aarav', 'Vihaan', 'Aditya', 'Vivaan', 'Reyansh', 'Arjun', 'Sai', 'Krishna', 'Kabir', 'Rohan', 'Aanya', 'Diya', 'Ishani', 'Kavya', 'Myra', 'Sara', 'Anika', 'Zara', 'Riya', 'Tara', 'Rahul', 'Manish', 'Priya', 'Pooja', 'Komal', 'Sunita', 'Rajesh', 'Suresh', 'Anil', 'Vinod', 'Meera', 'Geeta', 'Lakshmi', 'Hari', 'Mukesh'];
export const LN = ['Patel', 'Shah', 'Mehta', 'Desai', 'Joshi', 'Trivedi', 'Modi', 'Kapadia', 'Vyas', 'Bhatt', 'Pandya', 'Shukla', 'Gupta', 'Singh', 'Kumar', 'Sharma', 'Verma', 'Yadav', 'Reddy', 'Nair', 'Iyer'];
export const DEPTS = [...MAKSON_DEPARTMENTS];
export const LOCS = ['Surendranagar, GJ', 'Mandideep, MP', 'Gummadidala, TG', 'Morbi, GJ', 'Aurangabad, MH'];
export const DESIG = ['Operator', 'Senior Operator', 'Lead Operator', 'Supervisor', 'Senior Supervisor', 'Quality Inspector', 'Lab Technician', 'Manager', 'Executive', 'Senior Executive', 'Maintenance Technician', 'Forklift Operator', 'Storekeeper', 'Helper', 'Junior Operator', 'Apprentice', 'Trainee', 'Intern', 'Coordinator', 'Officer'];
const BANKS = ['HDFC Bank', 'Kotak Mahindra Bank', 'ICICI Bank', 'State Bank of India', 'Bank of Baroda', 'Punjab National Bank', 'Axis Bank', 'Union Bank of India'];
const ACCTYPES = ['Savings', 'Current', 'Salary'] as const;

const DEPT_WEIGHTS = [0.22, 0.14, 0.13, 0.12, 0.06, 0.08, 0.05, 0.07, 0.03, 0.02, 0.03, 0.05];
const LOC_WEIGHTS = [0.35, 0.25, 0.15, 0.14, 0.11];
const INACTIVE_RATES = [0.05, 0.04, 0.04, 0.08, 0.03, 0.06, 0.04, 0.09, 0.02, 0.01, 0.02, 0.07];

function weightedPick<T>(arr: T[], weights: number[], rVal: number): T {
  let cum = 0;
  for (let i = 0; i < weights.length; i++) {
    cum += weights[i]!;
    if (rVal < cum) return arr[i]!;
  }
  return arr[arr.length - 1]!;
}

export interface MockEmployee {
  empCode: string;
  name: string;
  gender: 'M' | 'F' | 'O';
  department: string;
  designation: string;
  location: string;
  timeShift: 'Day' | 'Night';
  alternateShift: 'A' | 'B' | 'C';
  weeklyOff: string[];
  joinDate: Date;
  biometricId: string;
  pan: string;
  aadhaar: string;
  bankAccountNumber: string;
  ifsc: string;
  accountHolderName: string;
  accountType: 'Savings' | 'Current' | 'Salary';
  bankName: string;
  pfNumber: string;
  esiNumber: string;
  status: 'Active' | 'Inactive';
}

export function generateEmployees(count = 1800): MockEmployee[] {
  const out: MockEmployee[] = [];
  for (let i = 0; i < count; i++) {
    const r = seededRandom(i * 7 + 3001);
    const dept = weightedPick(DEPTS, DEPT_WEIGHTS, r());
    const deptIdx = DEPTS.indexOf(dept);
    const loc = weightedPick(LOCS, LOC_WEIGHTS, r());
    const isInactive = r() < INACTIVE_RATES[deptIdx]!;
    const dayPct = deptIdx <= 7 ? 0.55 : 0.88;
    const timeShift = r() < dayPct ? 'Day' : 'Night';
    const altShifts: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
    const alternateShift = altShifts[Math.floor(r() * 3)]!;
    const desigPool =
      deptIdx <= 2 ? [0, 5, 10, 13, 14, 15, 16, 17] :
      deptIdx <= 4 ? [2, 7, 9, 17, 18] :
      deptIdx <= 7 ? [0, 3, 8, 6, 12, 19] : [0, 5, 6, 7, 9];
    const desig = DESIG[desigPool[Math.floor(r() * desigPool.length)]!]!;
    const baseYear = deptIdx >= 3 && deptIdx <= 7 ? 18 : 14;
    const joinYear = Math.min(25, Math.floor(r() * 8 + baseYear));
    const weeklyOff: string[] =
      deptIdx <= 2 ? ['Sunday'] :
      r() < 0.7 ? ['Sunday'] :
      r() < 0.4 ? ['Saturday', 'Sunday'] :
      ['Sunday'];

    out.push({
      empCode: `MKS${String(i + 1).padStart(4, '0')}`,
      name: `${FN[Math.floor(r() * FN.length)]!} ${LN[Math.floor(r() * LN.length)]!}`,
      gender: r() < 0.65 ? 'M' : 'F',
      department: dept,
      designation: desig,
      location: loc,
      timeShift,
      alternateShift,
      weeklyOff,
      joinDate: new Date(`20${joinYear}-${String(Math.floor(r() * 12 + 1)).padStart(2, '0')}-${String(Math.floor(r() * 28 + 1)).padStart(2, '0')}`),
      biometricId: `BIO${String(i + 1).padStart(3, '0')}`,
      pan: `ABCPD${String(Math.floor(r() * 9000 + 1000))}${String.fromCharCode(65 + Math.floor(r() * 26))}`,
      aadhaar: `${String(Math.floor(r() * 9000 + 1000))} ${String(Math.floor(r() * 9000 + 1000))} ${String(Math.floor(r() * 9000 + 1000))}`,
      bankAccountNumber: `${Math.floor(r() * 90000000 + 10000000)}${Math.floor(r() * 900000 + 100000)}`,
      ifsc: `HDFC0${String(Math.floor(r() * 900000 + 100000)).padStart(6, '0')}`,
      accountHolderName: `${FN[Math.floor(r() * FN.length)]!} ${LN[Math.floor(r() * LN.length)]!}`,
      accountType: ACCTYPES[Math.floor(r() * ACCTYPES.length)]!,
      bankName: BANKS[Math.floor(r() * BANKS.length)]!,
      pfNumber: `GJ/SUR/${Math.floor(r() * 90000 + 10000)}/${Math.floor(r() * 900 + 100)}`,
      esiNumber: String(Math.floor(r() * 9000000000 + 1000000000)),
      status: isInactive ? 'Inactive' : 'Active',
    });
  }
  return out;
}
