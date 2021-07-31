export default class EscapeCodes {
    public static readonly NULL = "\u0000";
    public static readonly SOH = "\u0001";
    public static readonly STX = "\u0002";
    public static readonly ETX = "\u0003";
    public static readonly EOT = "\u0004";
    public static readonly ENQ = "\u0005";
    public static readonly ACK = "\u0006";
    public static readonly BEL = "\u0007";
    public static readonly BS = "\u0008";
    public static readonly HT = "\u0009";
    public static readonly LF = "\u000A";
    public static readonly VT = "\u000B";
    public static readonly FF = "\u000C";
    public static readonly CR = "\u000D";

    public static readonly CAN = "\u0018";

    public static readonly ESC = "\u001B";

    public static readonly DEL = "\u007F";



    public static readonly BELL = EscapeCodes.BEL;
    public static readonly BACKSPACE = EscapeCodes.BS;
    public static readonly TAB = EscapeCodes.HT;
    public static readonly NEWLINE = EscapeCodes.LF;
    public static readonly CANCEL = EscapeCodes.CAN;
    public static readonly DELETE = EscapeCodes.DEL;
}
