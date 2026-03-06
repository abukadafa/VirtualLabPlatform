# Cybersecurity Lab - Kali Linux with security tools
FROM kalilinux/kali-rolling:latest

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Update and install desktop environment and tools
# We split this to avoid timeout/memory issues
RUN apt-get update && \
    apt-get install -y kali-desktop-xfce tightvncserver x11vnc xvfb dbus-x11

RUN apt-get install -y \
    kali-tools-top10 \
    nmap wireshark \
    burpsuite zaproxy \
    metasploit-framework autopsy \
    john hashcat \
    wget curl git vim nano firefox-esr \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create lab user
RUN useradd -m -s /bin/bash labuser && \
    echo "labuser:labpassword" | chpasswd && \
    usermod -aG sudo labuser

# Set up VNC
RUN mkdir -p /home/labuser/.vnc && \
    echo "labpassword" | vncpasswd -f > /home/labuser/.vnc/passwd && \
    chmod 600 /home/labuser/.vnc/passwd

# Create xstartup
RUN echo '#!/bin/bash\n\
xrdb $HOME/.Xresources\n\
startxfce4 &' > /home/labuser/.vnc/xstartup && \
    chmod +x /home/labuser/.vnc/xstartup

# Configure Wireshark to allow non-root capture
RUN echo "wireshark-common wireshark-common/install-setuid boolean true" | debconf-set-selections && \
    DEBIAN_FRONTEND=noninteractive dpkg-reconfigure wireshark-common && \
    usermod -a -G wireshark labuser

# Create startup script
RUN echo '#!/bin/bash\n\
rm -rf /tmp/.X1-lock /tmp/.X11-unix/X1\n\
vncserver :1 -geometry 1280x720 -depth 24\n\
tail -f /home/labuser/.vnc/*.log || tail -f /dev/null' > /home/labuser/startup.sh && \
    chmod +x /home/labuser/startup.sh

RUN chown -R labuser:labuser /home/labuser

USER labuser
WORKDIR /home/labuser

# Expose VNC port
EXPOSE 5901

CMD ["/home/labuser/startup.sh"]
