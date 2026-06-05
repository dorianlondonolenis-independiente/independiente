<%@ Page Language="VB" AutoEventWireup="false" Inherits="WSUNOEE.WFPruebaImportar" ValidateRequest="false" Codebehind="WFPruebaImportar.aspx.vb" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Untitled Page</title>
    <style type="text/css">
        #form1
        {
            height: 531px;
        }
        #TextArea1
        {
            height: 316px;
        }
        .style1
        {
            width: 136px;
        }
        .style2
        {
            width: 136px;
            height: 337px;
        }
        .style3
        {
            height: 337px;
        }
        .style4
        {
            width: 136px;
            height: 17px;
        }
        .style5
        {
            height: 17px;
        }
        .style6
        {
            width: 136px;
            height: 44px;
        }
        .style7
        {
            height: 44px;
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
    <table style="width: 100%; height: 264px;">
        <tr>
            <td class="style2">
                <asp:Label ID="Label2" runat="server" Font-Bold="True" Text="Parametro XML:"></asp:Label>
            </td>
            <td class="style3">
                <asp:TextBox ID="txtParametro" runat="server" Height="329px" 
                    TextMode="MultiLine" Width="643px"></asp:TextBox>
            </td>
        </tr>
        <tr>
            <td class="style6">
            </td>
            <td class="style7">
                <asp:CheckBox ID="chkCredenciales" runat="server" Text="Asignar credenciales" />
                <br />
                <asp:Button ID="Button1" runat="server" Text="Ejecutar" Width="91px" />
            &nbsp;
            </td>
        </tr>
        <tr>
            <td class="style4">
                <asp:Label ID="Label5" runat="server" Font-Bold="True" Text="Retorno:"></asp:Label>
            </td>
            <td class="style5">
                <asp:Label ID="lblRetorno" runat="server" ForeColor="Black" 
                    Text="&lt;&lt;Resultado retorno&gt;&gt;"></asp:Label>
            </td>
        </tr>
        <tr>
            <td class="style1">
                <asp:Label ID="Label4" runat="server" Font-Bold="True" Text="Resultado"></asp:Label>
            </td>
            <td>
                <asp:GridView ID="grdResultado" runat="server" Width="738px" BackColor="White" 
                    BorderColor="#DEDFDE" BorderStyle="None" BorderWidth="1px" CellPadding="4" 
                    ForeColor="Black" GridLines="Vertical">
                    <FooterStyle BackColor="#CCCC99" />
                    <RowStyle BackColor="#F7F7DE" />
                    <PagerStyle BackColor="#F7F7DE" ForeColor="Black" HorizontalAlign="Right" />
                    <SelectedRowStyle BackColor="#CE5D5A" Font-Bold="True" ForeColor="White" />
                    <HeaderStyle BackColor="#6B696B" Font-Bold="True" ForeColor="White" />
                    <AlternatingRowStyle BackColor="White" />
                </asp:GridView>
            </td>
        </tr>
    </table>
    </form>
</body>
</html>
