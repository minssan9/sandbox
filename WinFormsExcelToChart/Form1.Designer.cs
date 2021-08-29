
namespace WinFormsExcelToChart
{
    partial class form
    {
        /// <summary>
        /// 필수 디자이너 변수입니다.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// 사용 중인 모든 리소스를 정리합니다.
        /// </summary>
        /// <param name="disposing">관리되는 리소스를 삭제해야 하면 true이고, 그렇지 않으면 false입니다.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form 디자이너에서 생성한 코드

        /// <summary>
        /// 디자이너 지원에 필요한 메서드입니다. 
        /// 이 메서드의 내용을 코드 편집기로 수정하지 마세요.
        /// </summary>
        private void InitializeComponent()
        {
            System.Windows.Forms.DataVisualization.Charting.ChartArea chartArea4 = new System.Windows.Forms.DataVisualization.Charting.ChartArea();
            System.Windows.Forms.DataVisualization.Charting.Legend legend4 = new System.Windows.Forms.DataVisualization.Charting.Legend();
            System.Windows.Forms.DataVisualization.Charting.Series series4 = new System.Windows.Forms.DataVisualization.Charting.Series();
            this.chart1 = new System.Windows.Forms.DataVisualization.Charting.Chart();
            this.openFileDialog1 = new System.Windows.Forms.OpenFileDialog();
            this.flowLayoutPanel1 = new System.Windows.Forms.FlowLayoutPanel();
            this.openExcelFile = new System.Windows.Forms.Button();
            this.dataGridExcel = new System.Windows.Forms.DataGridView();
            this.txtColumnHeader = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            ((System.ComponentModel.ISupportInitialize)(this.chart1)).BeginInit();
            this.flowLayoutPanel1.SuspendLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dataGridExcel)).BeginInit();
            this.SuspendLayout();
            // 
            // chart1
            // 
            chartArea4.Name = "ChartArea1";
            this.chart1.ChartAreas.Add(chartArea4);
            this.chart1.Dock = System.Windows.Forms.DockStyle.Right;
            legend4.Name = "Legend1";
            this.chart1.Legends.Add(legend4);
            this.chart1.Location = new System.Drawing.Point(385, 0);
            this.chart1.Margin = new System.Windows.Forms.Padding(4);
            this.chart1.Name = "chart1";
            series4.ChartArea = "ChartArea1";
            series4.ChartType = System.Windows.Forms.DataVisualization.Charting.SeriesChartType.Line;
            series4.Legend = "Legend1";
            series4.Name = "Series1";
            this.chart1.Series.Add(series4);
            this.chart1.Size = new System.Drawing.Size(885, 968);
            this.chart1.TabIndex = 0;
            this.chart1.Text = "chart1";
            // 
            // openFileDialog1
            // 
            this.openFileDialog1.FileName = "openFileDialog1";
            // 
            // flowLayoutPanel1
            // 
            this.flowLayoutPanel1.AutoSizeMode = System.Windows.Forms.AutoSizeMode.GrowAndShrink;
            this.flowLayoutPanel1.Controls.Add(this.openExcelFile);
            this.flowLayoutPanel1.Controls.Add(this.label1);
            this.flowLayoutPanel1.Controls.Add(this.txtColumnHeader);
            this.flowLayoutPanel1.Controls.Add(this.dataGridExcel);
            this.flowLayoutPanel1.Dock = System.Windows.Forms.DockStyle.Left;
            this.flowLayoutPanel1.Location = new System.Drawing.Point(0, 0);
            this.flowLayoutPanel1.MaximumSize = new System.Drawing.Size(370, 968);
            this.flowLayoutPanel1.MinimumSize = new System.Drawing.Size(370, 900);
            this.flowLayoutPanel1.Name = "flowLayoutPanel1";
            this.flowLayoutPanel1.Size = new System.Drawing.Size(370, 968);
            this.flowLayoutPanel1.TabIndex = 3;
            // 
            // openExcelFile
            // 
            this.openExcelFile.Anchor = System.Windows.Forms.AnchorStyles.Left;
            this.openExcelFile.AutoSize = true;
            this.openExcelFile.Location = new System.Drawing.Point(0, 0);
            this.openExcelFile.Margin = new System.Windows.Forms.Padding(0);
            this.openExcelFile.MaximumSize = new System.Drawing.Size(340, 60);
            this.openExcelFile.Name = "openExcelFile";
            this.openExcelFile.Size = new System.Drawing.Size(340, 60);
            this.openExcelFile.TabIndex = 2;
            this.openExcelFile.Text = "Open Excel File";
            this.openExcelFile.UseVisualStyleBackColor = true;
            this.openExcelFile.Click += new System.EventHandler(this.openExcelFile_Click);
            // 
            // dataGridExcel
            // 
            this.dataGridExcel.AllowUserToOrderColumns = true;
            this.dataGridExcel.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize;
            this.dataGridExcel.Dock = System.Windows.Forms.DockStyle.Bottom;
            this.dataGridExcel.Location = new System.Drawing.Point(4, 98);
            this.dataGridExcel.Margin = new System.Windows.Forms.Padding(4);
            this.dataGridExcel.MaximumSize = new System.Drawing.Size(340, 890);
            this.dataGridExcel.Name = "dataGridExcel";
            this.dataGridExcel.RowHeadersWidth = 62;
            this.dataGridExcel.RowTemplate.Height = 23;
            this.dataGridExcel.Size = new System.Drawing.Size(340, 890);
            this.dataGridExcel.TabIndex = 3;
            // 
            // txtColumnHeader
            // 
            this.txtColumnHeader.Anchor = System.Windows.Forms.AnchorStyles.Left;
            this.txtColumnHeader.Location = new System.Drawing.Point(141, 63);
            this.txtColumnHeader.Name = "txtColumnHeader";
            this.txtColumnHeader.Size = new System.Drawing.Size(199, 28);
            this.txtColumnHeader.TabIndex = 4;
            this.txtColumnHeader.TextChanged += new System.EventHandler(this.textBox1_TextChanged);
            // 
            // label1
            // 
            this.label1.Anchor = System.Windows.Forms.AnchorStyles.Left;
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(3, 68);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(132, 18);
            this.label1.TabIndex = 5;
            this.label1.Text = "Column Header";
            // 
            // form
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(10F, 18F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(1270, 968);
            this.Controls.Add(this.flowLayoutPanel1);
            this.Controls.Add(this.chart1);
            this.Margin = new System.Windows.Forms.Padding(4);
            this.Name = "form";
            this.Text = "minssan9_ExcelToChart";
            this.Load += new System.EventHandler(this.form_Load);
            this.Resize += new System.EventHandler(this.Form1_Resize);
            ((System.ComponentModel.ISupportInitialize)(this.chart1)).EndInit();
            this.flowLayoutPanel1.ResumeLayout(false);
            this.flowLayoutPanel1.PerformLayout();
            ((System.ComponentModel.ISupportInitialize)(this.dataGridExcel)).EndInit();
            this.ResumeLayout(false);

        }

        #endregion

        private System.Windows.Forms.DataVisualization.Charting.Chart chart1;
        private System.Windows.Forms.OpenFileDialog openFileDialog1;
        private System.Windows.Forms.FlowLayoutPanel flowLayoutPanel1;
        private System.Windows.Forms.Button openExcelFile;
        private System.Windows.Forms.DataGridView dataGridExcel;
        private System.Windows.Forms.TextBox txtColumnHeader;
        private System.Windows.Forms.Label label1;
    }
}

