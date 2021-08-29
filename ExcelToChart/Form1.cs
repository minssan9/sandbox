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
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace ExcelToChart
{
    public partial class Form1 : Form
    {

        OpenFileDialog oFileDialog = new OpenFileDialog();
        BindingSource bindSource = new BindingSource();

        private void form_Load(object sender, EventArgs e)
        { 

            DateTime limitDt = new DateTime(2021, 12, 31, 20, 22, 0, 0);
            DateTime now = DateTime.Now;
            if (DateTime.Compare(limitDt, now) < 0)
            {
                Application.Exit();
                this.Close();
                return;
            }
        }


        public Form1()
        {
            InitializeComponent();

            this.ResizeRedraw = true;
            txtColumnHeader.Text = "Angle (°)";
        }

        private void openExcelFile_Click(object sender, EventArgs e)
        {

            List<String> filePaths = new List<String>();
            List<DataTable> dataTableList = new List<DataTable>();
            List<ColumnData> dataList = new List<ColumnData>();

            oFileDialog.Filter = "data file (*.csv)|*.csv;Excel (*.xlsx)|*.xlsx|*.xls";
            oFileDialog.Multiselect = true;

            oFileDialog.ShowDialog();
            for (int i = 0; i < oFileDialog.FileNames.Length; i++)
            {
                filePaths.Add(oFileDialog.FileNames[i]);
                String filePath = oFileDialog.FileNames[i];
                String fileName = oFileDialog.SafeFileNames[i];

                dataList.AddRange(ConvertCSVtoList(filePath, fileName));
            }

            List<ColumnData> resultList = new List<ColumnData>();

            String columnHeader = txtColumnHeader.Text;
            chart1.Series.Clear();
            Console.WriteLine(JsonConvert.SerializeObject(dataList));
            foreach (ColumnData c in dataList)
            {
                //if (c.header.Contains("Angle (°)"))
                if (c.header.Contains(columnHeader))
                {
                    chart1.Series.Add(c.header);
                    chart1.Series[c.header].ChartType = System.Windows.Forms.DataVisualization.Charting.SeriesChartType.Line;

                    resultList.Add(c);
                    foreach (double d in c.rowDatas)
                    {
                        chart1.Series[c.header].Points.Add(d);
                    }
                }
                Console.WriteLine(JsonConvert.SerializeObject(c.rowDatas));
            }
            //dataGridExcel.DataSource = resultList[0].rowDatas;
            chart1.DataBind();
        }

        public static DataTable getDataFromDataTableList(List<DataTable> dataTables)
        {
            DataTable resultDt = new DataTable();
            List<List<double>> valuesList = new List<List<double>>();

            foreach (DataTable dataTable in dataTables)
            {
                List<double> values = new List<double>();

                foreach (DataRow row in dataTable.Columns[2].Table.Rows)
                {
                    values.Add(double.Parse(row.ItemArray[2].ToString()));
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
            dt.TableName = strFilePath;
            return dt;
        }

        public static List<ColumnData> ConvertCSVtoList(string strFilePath, string strFileName)
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
                    columnList.Add(new ColumnData(strFileName + " // " + header));
                }


                while (!sr.EndOfStream)
                {
                    RowData rowData = new RowData();
                    string[] rows = sr.ReadLine().Split(',');
                    if (rows[0].Equals("") || rows[0].Contains("Event:20:time")) break;

                    columnList[0].rowDatas.Add(double.Parse(rows[0]));
                    columnList[1].rowDatas.Add(double.Parse(rows[1]));
                    columnList[2].rowDatas.Add(double.Parse(rows[2]));
                    columnList[3].rowDatas.Add(double.Parse(rows[3]));
                    columnList[4].rowDatas.Add(double.Parse(rows[4]));
                    columnList[5].rowDatas.Add(double.Parse(rows[5]));
                    columnList[6].rowDatas.Add(double.Parse(rows[6]));
                    columnList[7].rowDatas.Add(double.Parse(rows[7]));
                    columnList[8].rowDatas.Add(double.Parse(rows[8]));
                }
            }
            return columnList;
        }

        private void Form1_Resize(object sender, EventArgs e)
        {
            this.Invalidate();
            //chart1.Width = form.ActiveForm.Width - 400;
            //chart1.Height= form.ActiveForm.Height - 50;
        }


        private void openExcelFile_Click_1(object sender, EventArgs e)
        {

        }
    }
    public class ColumnData
    {
        public String header { get; set; }
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
}

