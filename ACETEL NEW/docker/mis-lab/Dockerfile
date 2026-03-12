# MIS Lab - Database and Business Intelligence Environment
FROM ubuntu:22.04

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies and desktop environment
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    xfce4 xfce4-goodies tightvncserver x11vnc \
    wget curl git vim nano ca-certificates \
    postgresql postgresql-contrib \
    r-base r-base-dev gdebi-core \
    python3 python3-pip \
    libreoffice \
    && apt-get clean && rm -rf /var/lib/apt/lists/*


# Install R packages
RUN R -e "install.packages(c('tidyverse', 'ggplot2', 'dplyr', 'shiny', 'plotly'), repos='http://cloud.r-project.org/')"

# Install RStudio
RUN wget --no-check-certificate https://download2.rstudio.org/server/jammy/amd64/rstudio-server-2023.12.1-402-amd64.deb -O /tmp/rstudio.deb && \
    apt-get update && \
    apt-get install -y /tmp/rstudio.deb && \
    rm /tmp/rstudio.deb

# Install Python data analysis tools
RUN pip3 install --no-cache-dir \
    pandas \
    numpy \
    matplotlib \
    seaborn \
    plotly \
    dash \
    sqlalchemy \
    psycopg2-binary \
    pymongo \
    pymysql \
    openpyxl \
    jupyter \
    jupyterlab

# Install Metabase (open-source BI tool, alternative to Tableau/Power BI)
RUN mkdir -p /opt/metabase && \
    wget https://downloads.metabase.com/v0.47.6/metabase.jar -O /opt/metabase/metabase.jar

# Create lab user
RUN useradd -m -s /bin/bash labuser && \
    echo "labuser:labpassword" | chpasswd

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

# Create desktop shortcuts
RUN mkdir -p /home/labuser/Desktop && \
    echo '[Desktop Entry]\nType=Application\nName=RStudio\nExec=/usr/lib/rstudio/rstudio\nIcon=rstudio\nTerminal=false' > /home/labuser/Desktop/rstudio.desktop && \
    echo '[Desktop Entry]\nType=Application\nName=Jupyter Lab\nExec=jupyter lab\nTerminal=true' > /home/labuser/Desktop/jupyter.desktop && \
    chmod +x /home/labuser/Desktop/*.desktop

RUN chown -R labuser:labuser /home/labuser

USER labuser
WORKDIR /home/labuser

# Expose VNC port
EXPOSE 5901

CMD ["/bin/bash", "-c", "vncserver :1 -geometry 1280x720 -depth 24 && tail -f /dev/null"]
