using System.Runtime.InteropServices;
using System.Security.Cryptography;

namespace ExileLedger;

static class FoundingTesterDialog
{
    public static bool Show(FoundingTesterAccess access)
    {
        using var dialog = new Form
        {
            Text = "Redeem tester code",
            Font = SystemFonts.MessageBoxFont,
            ClientSize = new Size(475, 122),
            AutoScaleMode = AutoScaleMode.Dpi,
            BackColor = Color.FromArgb(25, 24, 19),
            ForeColor = Color.FromArgb(238, 223, 190),
            StartPosition = FormStartPosition.CenterScreen,
            FormBorderStyle = FormBorderStyle.FixedDialog,
            MinimizeBox = false,
            MaximizeBox = false,
            ShowInTaskbar = false,
            TopMost = true,
        };
        var layout = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 3, Padding = new Padding(12) };
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100));
        layout.ColumnStyles.Add(new ColumnStyle(SizeType.AutoSize));
        dialog.Controls.Add(layout);

        var id = new TextBox { Text = access.GetInstallationId(), ReadOnly = true, Dock = DockStyle.Fill, TabStop = false };
        var code = new TextBox { Dock = DockStyle.Fill, MaxLength = 100, AccessibleName = "Tester code" };
        var copy = new Button { Text = "Copy ID", AutoSize = true };
        var redeem = new Button { Text = "Unlock", AutoSize = true };
        var status = new Label { AutoSize = true, Dock = DockStyle.Fill, ForeColor = Color.FromArgb(255, 190, 137) };
        layout.Controls.Add(new Label { Text = "Installation ID", AutoSize = true, Anchor = AnchorStyles.Left }, 0, 0);
        layout.Controls.Add(id, 1, 0);
        layout.Controls.Add(copy, 2, 0);
        layout.Controls.Add(new Label { Text = "Tester code", AutoSize = true, Anchor = AnchorStyles.Left }, 0, 1);
        layout.Controls.Add(code, 1, 1);
        layout.Controls.Add(redeem, 2, 1);
        layout.Controls.Add(status, 0, 2);
        layout.SetColumnSpan(status, 3);

        copy.Click += (_, _) =>
        {
            try
            {
                Clipboard.SetText(id.Text);
                status.Text = "Installation ID copied.";
            }
            catch (ExternalException)
            {
                id.Select();
                id.SelectAll();
                status.Text = "Press Ctrl+C to copy the installation ID.";
            }
        };
        redeem.Click += (_, _) =>
        {
            try
            {
                if (access.Redeem(code.Text)) dialog.DialogResult = DialogResult.OK;
                else status.Text = "That code is invalid for this installation.";
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or CryptographicException)
            {
                status.Text = "Could not save the tester code. Try again.";
            }
        };
        dialog.AcceptButton = redeem;
        dialog.ActiveControl = code;
        return dialog.ShowDialog() == DialogResult.OK;
    }
}
