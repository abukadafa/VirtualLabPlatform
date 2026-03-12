# Cybersecurity Lab - Kali Linux with security tools
FROM kalilinux/kali-rolling:latest

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Update and install desktop environment
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y kali-desktop-xfce tightvncserver x11vnc && \
    apt-get install -y kali-tools-top10 nmap wireshark && \
    apt-get install -y burpsuite zaproxy && \
    apt-get install -y metasploit-framework autopsy && \
    apt-get install -y john hashcat && \
    apt-get install -y wget curl git vim nano firefox-esr && \
    apt-get clean


# Create lab user
RUN useradd -m -s /bin/bash labuser && \
    echo "labuser:labpassword" | chpasswd && \
    usermod -aG sudo labuser

# Set up VNC
RUN mkdir -p /home/labuser/.vnc && \
    echo "labpassword" | vncpasswd -f > /home/labuser/.vnc/passwd && \
    chmod 600 /home/labuser/.vnc/passwd

# Create startup script
RUN echo '#!/bin/bash\nvncserver :1 -geometry 1280x720 -depth 24' > /home/labuser/start-vnc.sh && \
    chmod +x /home/labuser/start-vnc.sh

# Set up xstartup for VNC
RUN echo '#!/bin/bash\nxrdb $HOME/.Xresources\nstartxfce4 &' > /home/labuser/.vnc/xstartup && \
    chmod +x /home/labuser/.vnc/xstartup

RUN chown -R labuser:labuser /home/labuser

# Configure Wireshark to allow non-root capture
RUN echo "wireshark-common wireshark-common/install-setuid boolean true" | debconf-set-selections && \
    DEBIAN_FRONTEND=noninteractive dpkg-reconfigure wireshark-common && \
    usermod -a -G wireshark labuser

USER labuser
WORKDIR /home/labuser

# Expose VNC port
EXPOSE 5901

CMD ["/bin/bash", "-c", "vncserver :1 -geometry 1280x720 -depth 24 && tail -f /dev/null"]
