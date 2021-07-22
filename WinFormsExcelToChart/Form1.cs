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
    public partial class Form1 : Form
    {
        OpenFileDialog oFileDialog = new OpenFileDialog();
        List<DataTable> dataTableList = new List<DataTable>();
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

            DataTable resultDt = new DataTable();
            resultDt = getDataTableFromFiles(dataTableList);
            dataGridExcel.DataSource = resultDt;
        }
        //private void btnDrawChart_Click(object sender, RoutedEventArgs e)
        //{
        //    DataTable dtChart = new DataTable();
        //    gridChart(dtChart);
        //}


        public static DataTable getDataTableFromFiles(List<DataTable> dataTables)
        {
            DataTable resultDt = new DataTable();
            foreach (DataTable dataTable in dataTables)
            {
                DataColumn dataColumn = new DataColumn();
                dataColumn.ColumnName = dataTable.TableName;
                foreach (DataRow row in dataTable.Columns[2].Table.Rows)
                {
                    dataColumn.Table.Rows.Add(row);
                }                
                resultDt.Columns.Add(dataColumn);
            }

            return resultDt;
        }
        private void gridChart(DataTable dataTable)
        {

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

    }
}  