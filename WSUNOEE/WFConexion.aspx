<%@ Page Language="VB" AutoEventWireup="false" Inherits="WSUNOEE.WFConexion" validateRequest="false" Codebehind="WFConexion.aspx.vb" %>

<%--<%@ Register assembly="UNOEEMsgboxWeb" namespace="UNOEEMsgboxWeb" tagprefix="cc1" %>--%>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Configuración conexión WSUNOEE</title>
    <style type="text/css">
        .style2
        {
            margin-left: 1px;
        }
        .style3
        {
            width: 422px;
            height: 363px;
        }
        .style4
        {
            width: 99%;
            height: 74px;
        }
        .style5
        {
            width: 385px;
            height: 26px;
        }
        .style6
        {
            width: 385px;
            text-align: left;
            height: 17px;
        }
        .style7
        {
        	width: 169px;
            height: 17px;
        }
        .style10
        {
            width: 385px;
            height: 17px;
        }
        .style12
        {
            height: 19px;
        }
        .style13
        {
            height: 19px;
        }
        .style15
        {
            width: 385px;
            height: 19px;
        }
        .style16
        {
        	width: 169px;
            height: 19px;
        }
        .style18
        {
            height: 7px;
        }
        .style19
        {
            width: 385px;
            height: 3px;
        }
        .auto-style1 {
            height: 26px;
            width: 193px;
        }
        .auto-style2 {
            width: 193px;
            height: 17px;
        }
        .auto-style3 {
            width: 193px;
            height: 19px;
        }
        .auto-style4 {
            height: 7px;
            width: 193px;
        }
        .auto-style5 {
            height: 3px;
            width: 193px;
        }
    </style>
</head>
<body text="Blue" bgcolor="Silver" vlink="#3399ff">
    <form id="form1" runat="server" class="style3" submitdisabledcontrols="False">
    <div>
        <table align="left" class="style4">
        <caption>
            <span lang="es" 
                style="font-family: Arial; font-weight: bold; text-decoration: underline">Configuración 
            conexión base de datos</span></caption>
        <tr>
            <td class="style6">
                <asp:Label ID="lblConexion" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Text="Conexión:"></asp:Label>
            </td>
            <td class="auto-style2">
                <asp:DropDownList ID="cboConexiones" runat="server" AutoPostBack="True" 
                    Width="190px">
                </asp:DropDownList>
            </td>
        </tr>
        <tr>
            <td class="style15">
                <asp:Label ID="Label8" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Text="Nombre Conexión:"></asp:Label>
            </td>
            <td class="auto-style3">
                <asp:TextBox ID="txtNombreConexion" runat="server" Width="184px"></asp:TextBox>
            </td>
        </tr>
        <tr>
            <td class="style15">
                <asp:Label ID="Label2" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Text="Tipo BD:" Height="16px"></asp:Label>
            </td>
            <td class="auto-style3">
                <asp:DropDownList ID="cboTipo" runat="server" Width="190px" 
                    AutoPostBack="True">
                    <asp:ListItem Value="SQL">SQL Server</asp:ListItem>
                    <asp:ListItem Value="ORA">Oracle</asp:ListItem>
                    <asp:ListItem Value="PG">PostgreSQL</asp:ListItem>
                </asp:DropDownList>
            </td>
        </tr>
        <tr>
            <td class="style10">
                <asp:Label ID="lblServidor" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Text="Nombre Servidor:" Height="17px"></asp:Label>
            </td>
            <td class="auto-style2">
                <asp:TextBox ID="txtServidor" runat="server" Width="184px"></asp:TextBox>
            </td>
        </tr>
        <tr>
            <td class="style10">
                <asp:Label ID="Label4" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Text="Nombre BD:" Height="17px"></asp:Label>
            </td>
            <%--<cc1:MsgBox ID="MsgBox1" runat="server" />--%>
            <td class="auto-style2">
                <asp:TextBox ID="txtNombreBD" runat="server" Width="184px"></asp:TextBox>
            </td>
        </tr>
             <tr id="trPuerto" runat="server" visible="false">
            <td class="style10">
                <asp:Label ID="lblPuerto" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Text="Puerto:" Height="17px"  Visible="false"></asp:Label>
            </td>
            <%--<cc1:MsgBox ID="MsgBox1" runat="server" />--%>
            <td class="auto-style2">
                <asp:TextBox ID="txtPuerto" runat="server" Width="44px" Visible="false" MaxLength="5" ></asp:TextBox>
            </td>
        </tr>
        <tr>
            <td class="style10">
                <span lang="es">
                <asp:Label ID="Label5" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Text="Usuario:" Height="17px"></asp:Label>
                </span>
            </td>
            <td class="auto-style2">
                <asp:TextBox ID="txtUsuario" runat="server" CssClass="style2" 
                    Width="184px"></asp:TextBox>
            </td>
        </tr>
        <tr>
            <td class="style15">
                <asp:Label ID="Label6" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Text="Password:" Height="17px"></asp:Label>
            </td>
            <td class="auto-style4">
                <asp:TextBox ID="txtPassword" runat="server" CssClass="style2" 
                    TextMode="Password" Width="184px"></asp:TextBox>
            </td>
        </tr>
        <tr>
            <td class="style15">
                <asp:Label ID="Label9" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Text="Confirmar Password:" Font-Size="Medium"></asp:Label>
            </td>
            <td class="auto-style3">
                <asp:TextBox ID="txtConfirmarPassword" runat="server" Width="184px" 
                    TextMode="Password"></asp:TextBox>
            </td>
        </tr>
        <tr>
            <td class="style15">
                <asp:Label ID="Label10" runat="server" Font-Bold="True" Font-Names="Arial" 
                    Font-Size="Medium" Text="Núm conexión importación:"></asp:Label>
            </td>
            <td class="auto-style3">
                <asp:TextBox ID="txtNumConexion" runat="server" MaxLength="3" Width="44px"></asp:TextBox>
            </td>
        </tr>
        <tr>
            <td class="style19">
                <asp:Button ID="btnProbar" runat="server" Height="22px" Text="Probar" 
                    Width="96px" />
            </td>
            <td class="auto-style5">
                <asp:Button ID="btnAplicar" runat="server" Text="Aplicar" Width="96px" 
                    Height="22px" />
                <asp:Button ID="btnEliminar" runat="server" Text="Eliminar" Width="90px" 
                    Height="22px" Enabled="False" />
            </td>
        </tr>
        <tr>
            <td class="style5">
                <asp:Label ID="lblOperacion" runat="server" ForeColor="Red" 
                    Text="&lt;&lt;Operacion&gt;&gt;" Width="183px"></asp:Label>
            </td>
            <td class="auto-style1">
                </td>
        </tr>
    </table>
    </div>
        <p>
            &nbsp;</p>
    <asp:HiddenField ID="hidPassword" runat="server" />
    </form>
</body>
</html>
