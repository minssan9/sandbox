using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace WinFormsExcelToChart
{
    public class ColumnData
    {
        String header;
        public List<double> rowDatas { get; set; }

        public ColumnData(string header)
        {
            this.header = header;
            this.rowDatas = new List<double>();
        }
    }
    public class RowData
    {
        public double value0 { get; set; }
        public double value1 { get; set; }
        public double value2 { get; set; }
        public double value3 { get; set; }
        public double value4 { get; set; }
        public double value5 { get; set; }
        public double value6 { get; set; }
        public double value7 { get; set; }
        public double value8 { get; set; }
    }

    public partial class Form1 : Form
    {

        OpenFileDialog oFileDialog = new OpenFileDialog();
        List<DataTable> dataTableList = new List<DataTable>();
        List<ColumnData> dataList = new List<ColumnData>();
        BindingSource bindSource = new BindingSource();
        List<String> fileNames = new List<String>();

        public Form1()
        {
            InitializeComponent();
        }

        private void button1_Click(object sender, EventArgs e)
        {
            oFileDialog.Filter = "data file (*.csv)|*.csv;Excel (*.xlsx)|*.xlsx|*.xls";
            oFileDialog.Multiselect = true;

            oFileDialog.ShowDialog();
            foreach (string fileName in oFileDialog.FileNames)
            {
                fileNames.Add(fileName);
                dataTableList.Add(ConvertCSVtoDataTable(fileName));
            }

            foreach (string fileName in oFileDialog.FileNames)
            {
                fileNames.Add(fileName);
                dataList = ConvertCSVtoList(fileName);
            }

            DataTable resultDt = new DataTable();
            resultDt = getDataFromDataTableList(dataTableList);
            dataGridExcel.DataSource = dataList;

            chart1.DataSource = dataList;
        } 

        //public static DataTable getDataFromDataTableList(List<DataTable> dataTables, List<List<double>> datasList)
        //{ 



        //    return dt;
        //}

        public static DataTable getDataFromDataTableList(List<DataTable> dataTables)
        {
            DataTable resultDt = new DataTable();
            List<List<double>> valuesList = new List<List<double>>();

            foreach (DataTable dataTable in dataTables)
            {
                List<double> values = new List<double>();
                
                foreach (DataRow row in dataTable.Columns[2].Table.Rows)
                {
                    values.Add(double.Parse(row.ItemArray[2].ToString()) );
                }

                DataColumn dataColumn = new DataColumn();
                dataColumn.ColumnName = dataTable.TableName;
                resultDt.Columns.Add(dataColumn);
            }
            return resultDt;
        }
        public static DataTable ConvertCSVtoDataTable(string strFilePath)
        {
            DataTable dt = new DataTable();
            using (StreamReader sr = new StreamReader(strFilePath))
            {
                for (int i = 0; i < 24; i++)
                {
                    sr.ReadLine();
                }

                string[] headers = sr.ReadLine().Split(',');                 
                foreach (string header in headers)
                {
                    dt.Columns.Add(header);
                }


                while (!sr.EndOfStream)
                {                    
                    string[] rows = sr.ReadLine().Split(',');
                    if (rows[0].Equals("") || rows[0].Contains("Event:20:time")) break;

                    DataRow dr = dt.NewRow();
                    for (int i = 0; i < headers.Length; i++)
                    {
                        dr[i] = rows[i];
                    }
                    dt.Rows.Add(dr);
                }
            }
            dt.TableName =strFilePath;
            return dt;
        }

        public static List<ColumnData> ConvertCSVtoList(string strFilePath)
        {
            List<ColumnData> columnList = new List<ColumnData>();
            using (StreamReader sr = new StreamReader(strFilePath))
            {
                for (int i = 0; i < 24; i++)
                {
                    sr.ReadLine();
                }

                string[] headers = sr.ReadLine().Split(',');
                foreach (string header in headers)
                { 
                    columnList.Add(new ColumnData(header));
                }

                
                while (!sr.EndOfStream)
                {
                    RowData rowData = new RowData();
                    string[] rows = sr.ReadLine().Split(',');
                    if (rows[0].Equals("") || rows[0].Contains("Event:20:time")) break;

                    //rowData.value0 = double.Parse(rows[0]);
                    //rowData.value1 = double.Parse(rows[1]);
                    //rowData.value2 = double.Parse(rows[2]);
                    //rowData.value3 = double.Parse(rows[3]);
                    //rowData.value4 = double.Parse(rows[4]);
                    //rowData.value5 = double.Parse(rows[5]);
                    //rowData.value6 = double.Parse(rows[6]);
                    //rowData.value7 = double.Parse(rows[7]);
                    //rowData.value8 = double.Parse(rows[8]);


                    columnList[0].rowDatas.Add( double.Parse(rows[0]));
                    columnList[1].rowDatas.Add( double.Parse(rows[1]));
                    columnList[2].rowDatas.Add( double.Parse(rows[2]));
                    columnList[3].rowDatas.Add( double.Parse(rows[3]));
                    columnList[4].rowDatas.Add( double.Parse(rows[4]));
                    columnList[5].rowDatas.Add( double.Parse(rows[5]));
                    columnList[6].rowDatas.Add( double.Parse(rows[6]));
                    columnList[7].rowDatas.Add( double.Parse(rows[7]));
                    columnList[8].rowDatas.Add(double.Parse(rows[8]));                     
                }
            }
            return columnList;
        }

    }
}  